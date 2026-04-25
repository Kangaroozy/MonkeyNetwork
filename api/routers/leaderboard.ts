import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { resolveLuckPermsPrimaryGroups } from "../queries/luckPerms";
import { sql, type SQL } from "drizzle-orm";

function extractRows<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    if (raw.length > 0 && Array.isArray(raw[0])) {
      return raw[0] as T[];
    }
    return raw as T[];
  }
  if (raw && typeof raw === "object") {
    const maybeRows = (raw as { rows?: unknown }).rows;
    if (Array.isArray(maybeRows)) {
      return maybeRows as T[];
    }
  }
  return [];
}

function toHeadAvatarUrl(skinUrl: string | null | undefined, playerUuidHex: string, username: string): string {
  const normalizedSkinUrl = (skinUrl ?? "").trim();
  if (normalizedSkinUrl.length > 0) {
    const hashMatch = normalizedSkinUrl.match(/\/texture\/([a-f0-9]+)$/i);
    if (hashMatch?.[1]) {
      return `https://mc-heads.net/avatar/${hashMatch[1]}/64`;
    }
  }
  if (playerUuidHex && playerUuidHex.length >= 32) {
    return `https://mc-heads.net/avatar/${playerUuidHex}/64`;
  }
  return `https://mc-heads.net/avatar/${encodeURIComponent(username)}/64`;
}

export const leaderboardRouter = createRouter({
  filters: publicQuery
    .input(
      z.object({
        mode: z.string().default("overall"),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const modesQueryRaw = await db.execute(
        sql`
          SELECT DISTINCT gamemode_key AS gamemodeKey
          FROM player_stats_mode_all
          WHERE gamemode_key IS NOT NULL AND gamemode_key <> ''
          ORDER BY gamemode_key ASC
        `,
      );
      const kitsWhere =
        input.mode === "overall"
          ? sql`WHERE kit_key IS NOT NULL AND kit_key <> ''`
          : sql`WHERE gamemode_key = ${input.mode} AND kit_key IS NOT NULL AND kit_key <> ''`;
      const kitsQueryRaw = await db.execute(
        sql`
          SELECT DISTINCT kit_key AS kitKey
          FROM player_stats_mode_kit
          ${kitsWhere}
          ORDER BY kit_key ASC
        `,
      );
      const modeRows = extractRows<{ gamemodeKey: string }>(modesQueryRaw);
      const kitRows = extractRows<{ kitKey: string }>(kitsQueryRaw);
      return {
        modes: modeRows.map((row) => row.gamemodeKey),
        kits: kitRows.map((row) => row.kitKey),
      };
    }),

  list: publicQuery
    .input(
      z
        .object({
          mode: z.string().default("overall"),
          classScope: z.enum(["all", "kit"]).default("all"),
          kitKey: z.string().min(1).max(32).optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(100).default(50),
          sortBy: z
            .enum([
              "username",
              "wins",
              "winRate",
              "kda",
              "deaths",
              "killAverage",
              "totalKills",
              "matchesPlayed",
            ])
            .default("kda"),
          sortOrder: z.enum(["asc", "desc"]).default("desc"),
        })
        .superRefine((value, ctx) => {
          if (value.classScope === "kit" && !value.kitKey) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["kitKey"],
              message: "kitKey is required when classScope is kit.",
            });
          }
        }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const offset = (input.page - 1) * input.limit;
      const metricOrder: Record<typeof input.sortBy, SQL> = {
        username: sql`username`,
        wins: sql`wins`,
        winRate: sql`winRate`,
        kda: sql`kda`,
        deaths: sql`deaths`,
        killAverage: sql`killAverage`,
        totalKills: sql`totalKills`,
        matchesPlayed: sql`matchesPlayed`,
      };
      const direction = input.sortOrder === "asc" ? sql`ASC` : sql`DESC`;
      const orderExpr = metricOrder[input.sortBy] ?? metricOrder.totalKills;

      const whereConditions: SQL[] = [];
      if (input.mode !== "overall") {
        whereConditions.push(sql`stats.gamemode_key = ${input.mode}`);
      }
      if (input.classScope === "kit") {
        whereConditions.push(sql`stats.kit_key = ${input.kitKey ?? ""}`);
      }
      const whereClause =
        whereConditions.length > 0 ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}` : sql``;

      const statsSource =
        input.classScope === "kit"
          ? sql`
              SELECT
                stats.player_uuid AS player_uuid,
                SUM(stats.wins) AS wins,
                SUM(stats.losses) AS losses,
                SUM(stats.kills) AS totalKills,
                SUM(stats.deaths) AS deaths,
                SUM(stats.matches_played) AS matchesPlayed
              FROM player_stats_mode_kit stats
              ${whereClause}
              GROUP BY stats.player_uuid
            `
          : sql`
              SELECT
                stats.player_uuid AS player_uuid,
                SUM(stats.wins) AS wins,
                SUM(stats.losses) AS losses,
                SUM(stats.kills) AS totalKills,
                SUM(stats.deaths) AS deaths,
                SUM(stats.matches_played) AS matchesPlayed
              FROM player_stats_mode_all stats
              ${whereClause}
              GROUP BY stats.player_uuid
            `;

      const leaderboardRowsRaw = await db.execute(
        sql`
          WITH aggregated AS (${statsSource})
          SELECT
            LOWER(HEX(aggregated.player_uuid)) AS playerUuidHex,
            COALESCE(web_profile.player_name, LEFT(LOWER(HEX(aggregated.player_uuid)), 12)) AS username,
            web_profile.skin_url AS avatarUrl,
            COALESCE(profile.rank, 'default') AS rankKey,
            COALESCE(profile.level, 1) AS level,
            aggregated.wins AS wins,
            aggregated.losses AS losses,
            aggregated.totalKills AS totalKills,
            aggregated.deaths AS deaths,
            aggregated.matchesPlayed AS matchesPlayed,
            CASE
              WHEN aggregated.matchesPlayed <= 0 THEN 0
              ELSE aggregated.wins / aggregated.matchesPlayed
            END AS winRate,
            CASE
              WHEN aggregated.deaths <= 0 THEN aggregated.totalKills
              ELSE aggregated.totalKills / aggregated.deaths
            END AS kda,
            CASE
              WHEN aggregated.matchesPlayed <= 0 THEN 0
              ELSE aggregated.totalKills / aggregated.matchesPlayed
            END AS killAverage
          FROM aggregated
          LEFT JOIN player_web_profile web_profile ON web_profile.unique_id = aggregated.player_uuid
          LEFT JOIN player_profile profile ON profile.unique_id = aggregated.player_uuid
          ORDER BY ${orderExpr} ${direction}, username ASC
          LIMIT ${input.limit} OFFSET ${offset}
        `,
      );

      const countRowsRaw = await db.execute(
        sql`
          WITH aggregated AS (${statsSource})
          SELECT COUNT(*) AS total
          FROM aggregated
        `,
      );
      const leaderboardRows = extractRows<{
        playerUuidHex: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
        wins: number;
        losses: number;
        totalKills: number;
        deaths: number;
        matchesPlayed: number;
        winRate: number;
        kda: number;
        killAverage: number;
      }>(leaderboardRowsRaw);
      const countRows = extractRows<{ total: number }>(countRowsRaw);
      const total = Number(countRows[0]?.total ?? 0);

      const luckPermsGroups = await resolveLuckPermsPrimaryGroups(
        leaderboardRows.map((row) => row.playerUuidHex),
      );

      const players = leaderboardRows.map((row, index) => {
        const uuidHex = (row.playerUuidHex ?? "").toLowerCase();
        const fallbackRank = (row.rankKey ?? "default").toLowerCase();
        const rankKey = luckPermsGroups.get(uuidHex) ?? fallbackRank;
        return {
          rank: offset + index + 1,
          playerId: row.playerUuidHex,
          username: row.username,
          avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.playerUuidHex, row.username),
          rankKey,
          level: Number(row.level ?? 1),
          wins: Number(row.wins ?? 0),
          losses: Number(row.losses ?? 0),
          totalKills: Number(row.totalKills ?? 0),
          deaths: Number(row.deaths ?? 0),
          matchesPlayed: Number(row.matchesPlayed ?? 0),
          winRate: Number(row.winRate ?? 0),
          kda: Number(row.kda ?? 0),
          killAverage: Number(row.killAverage ?? 0),
        };
      });

      return {
        players,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.limit),
      };
    }),
});
