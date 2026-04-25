import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { resolveLuckPermsPrimaryGroups } from "../queries/luckPerms";
import { players, rankings, gameModes } from "@db/schema";
import { eq, sql } from "drizzle-orm";

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

function toHeadAvatarUrl(avatarUrl: string | null | undefined, idOrUsername: string): string {
  const source = (avatarUrl ?? "").trim();
  if (source.length > 0) {
    const hashMatch = source.match(/\/texture\/([a-f0-9]+)$/i);
    if (hashMatch?.[1]) {
      return `https://mc-heads.net/avatar/${hashMatch[1]}/64`;
    }
  }
  return `https://mc-heads.net/avatar/${encodeURIComponent(idOrUsername)}/64`;
}

function xpRequiredForLevel(level: number): number {
  if (level >= 1000) {
    return 0;
  }
  if (level <= 1) {
    return 500;
  }
  if (level === 2) {
    return 750;
  }
  if (level === 3) {
    return 1000;
  }
  if (level === 4) {
    return 1250;
  }
  if (level === 5) {
    return 1500;
  }
  if (level === 6) {
    return 1750;
  }
  if (level === 7) {
    return 2000;
  }
  if (level === 8) {
    return 2500;
  }
  return 3000;
}

export const playerRouter = createRouter({
  search: publicQuery
    .input(z.object({
      query: z.string().min(1).max(32),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const raw = await db.execute(sql`
        SELECT
          LOWER(HEX(unique_id)) AS id,
          player_name AS username,
          skin_url AS avatarUrl,
          COALESCE(profile.rank, 'default') AS rankKey,
          COALESCE(profile.level, 1) AS level
        FROM player_web_profile web_profile
        LEFT JOIN player_profile profile ON profile.unique_id = web_profile.unique_id
        WHERE player_name LIKE ${`%${input.query}%`}
        ORDER BY
          CASE
            WHEN LOWER(player_name) = LOWER(${input.query}) THEN 0
            WHEN LOWER(player_name) LIKE LOWER(${`${input.query}%`}) THEN 1
            ELSE 2
          END,
          updated_at DESC
        LIMIT ${input.limit}
      `);
      const rows = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
      }>(raw);
      const luckPermsGroups = await resolveLuckPermsPrimaryGroups(rows.map((row) => row.id));
      return rows.map((row) => {
        const uuidHex = (row.id ?? "").toLowerCase();
        const fallbackRank = (row.rankKey ?? "default").toLowerCase();
        return {
          ...row,
          avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
          rankKey: luckPermsGroups.get(uuidHex) ?? fallbackRank,
          level: Number(row.level ?? 1),
        };
      });
    }),

  previewByUsername: publicQuery
    .input(z.object({
      username: z.string().min(1).max(32),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const raw = await db.execute(sql`
        WITH target AS (
          SELECT unique_id, player_name, skin_url
          FROM player_web_profile
          WHERE LOWER(player_name) = LOWER(${input.username})
          ORDER BY updated_at DESC
          LIMIT 1
        ),
        agg AS (
          SELECT
            SUM(stats.wins) AS wins,
            SUM(stats.losses) AS losses,
            SUM(stats.kills) AS kills,
            SUM(stats.deaths) AS deaths,
            SUM(stats.matches_played) AS matchesPlayed
          FROM player_stats_mode_all stats
          INNER JOIN target ON target.unique_id = stats.player_uuid
        )
        SELECT
          LOWER(HEX(target.unique_id)) AS id,
          target.player_name AS username,
          target.skin_url AS avatarUrl,
          COALESCE(profile.rank, 'default') AS rankKey,
          COALESCE(profile.level, 1) AS level,
          COALESCE(profile.exp, 0) AS exp,
          COALESCE(agg.wins, 0) AS wins,
          COALESCE(agg.losses, 0) AS losses,
          COALESCE(agg.kills, 0) AS kills,
          COALESCE(agg.deaths, 0) AS deaths,
          COALESCE(agg.matchesPlayed, 0) AS matchesPlayed
        FROM target
        LEFT JOIN player_profile profile ON profile.unique_id = target.unique_id
        LEFT JOIN agg ON 1 = 1
      `);
      const [row] = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
        exp: number | null;
        wins: number;
        losses: number;
        kills: number;
        deaths: number;
        matchesPlayed: number;
      }>(raw);
      if (!row) {
        return null;
      }
      const kills = Number(row.kills ?? 0);
      const deaths = Number(row.deaths ?? 0);
      const matchesPlayed = Number(row.matchesPlayed ?? 0);
      const wins = Number(row.wins ?? 0);
      const level = Number(row.level ?? 1);
      const expCurrent = Number(row.exp ?? 0);
      const expRequired = xpRequiredForLevel(level);
      const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
      const kda = deaths > 0 ? kills / deaths : kills;
      const killAverage = matchesPlayed > 0 ? kills / matchesPlayed : 0;
      const luckPermsGroups = await resolveLuckPermsPrimaryGroups([row.id]);
      const fallbackRank = (row.rankKey ?? "default").toLowerCase();
      return {
        ...row,
        avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
        rankKey: luckPermsGroups.get((row.id ?? "").toLowerCase()) ?? fallbackRank,
        level,
        expCurrent,
        expRequired,
        expProgress: expRequired > 0 ? Math.max(0, Math.min(1, expCurrent / expRequired)) : 1,
        wins,
        losses: Number(row.losses ?? 0),
        kills,
        deaths,
        matchesPlayed,
        winRate,
        kda,
        killAverage,
      };
    }),

  getByUsername: publicQuery
    .input(z.object({
      username: z.string().min(1).max(32),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.username, input.username))
        .limit(1);

      if (!player) return null;

      const modeBreakdown = await db
        .select({
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          modeColor: gameModes.accentColor,
          tier: rankings.tier,
          points: rankings.points,
          wins: rankings.wins,
          losses: rankings.losses,
          winRate: rankings.winRate,
          rankPosition: rankings.rankPosition,
          matchesPlayed: rankings.matchesPlayed,
          bestStreak: rankings.bestStreak,
        })
        .from(rankings)
        .innerJoin(gameModes, eq(rankings.modeId, gameModes.id))
        .where(eq(rankings.playerId, player.id));

      return { ...player, modeBreakdown };
    }),

  getById: publicQuery
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, input.id))
        .limit(1);
      return player ?? null;
    }),
});
