import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
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
          skin_url AS avatarUrl
        FROM player_web_profile
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
      }>(raw);
      return rows.map((row) => ({
        ...row,
        avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
      }));
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
          COALESCE(agg.wins, 0) AS wins,
          COALESCE(agg.losses, 0) AS losses,
          COALESCE(agg.kills, 0) AS kills,
          COALESCE(agg.deaths, 0) AS deaths,
          COALESCE(agg.matchesPlayed, 0) AS matchesPlayed
        FROM target
        LEFT JOIN agg ON 1 = 1
      `);
      const [row] = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
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
      const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
      const kda = deaths > 0 ? kills / deaths : kills;
      const killAverage = matchesPlayed > 0 ? kills / matchesPlayed : 0;
      return {
        ...row,
        avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
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
