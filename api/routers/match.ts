import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { matches, tierHistory, gameModes } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const matchRouter = createRouter({
  history: publicQuery
    .input(z.object({
      playerId: z.number(),
      mode: z.string().optional(),
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      const query = db
        .select({
          id: matches.id,
          opponentId: matches.opponentId,
          opponentName: matches.opponentName,
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          result: matches.result,
          playerScore: matches.playerScore,
          opponentScore: matches.opponentScore,
          tierChange: matches.tierChange,
          playedAt: matches.playedAt,
        })
        .from(matches)
        .innerJoin(gameModes, eq(matches.modeId, gameModes.id))
        .where(eq(matches.playerId, input.playerId))
        .orderBy(desc(matches.playedAt))
        .limit(input.limit)
        .offset(input.offset);

      return query;
    }),

  tierHistory: publicQuery
    .input(z.object({
      playerId: z.number(),
      mode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      const query = db
        .select({
          id: tierHistory.id,
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          oldTier: tierHistory.oldTier,
          newTier: tierHistory.newTier,
          changedAt: tierHistory.changedAt,
        })
        .from(tierHistory)
        .innerJoin(gameModes, eq(tierHistory.modeId, gameModes.id))
        .where(eq(tierHistory.playerId, input.playerId))
        .orderBy(desc(tierHistory.changedAt));

      return query;
    }),

  recent: publicQuery
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 10;

      return db
        .select({
          id: matches.id,
          playerUsername: sql<string>`(SELECT username FROM players WHERE id = matches.player_id)`,
          opponentName: matches.opponentName,
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          result: matches.result,
          playerScore: matches.playerScore,
          opponentScore: matches.opponentScore,
          playedAt: matches.playedAt,
        })
        .from(matches)
        .innerJoin(gameModes, eq(matches.modeId, gameModes.id))
        .orderBy(desc(matches.playedAt))
        .limit(limit);
    }),
});
