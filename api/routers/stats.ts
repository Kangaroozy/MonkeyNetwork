import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { players, matches } from "@db/schema";
import { sql } from "drizzle-orm";

export const statsRouter = createRouter({
  overview: publicQuery.query(async () => {
    const db = getDb();

    const [playerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(players);

    const [matchCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(matches);

    const modeCounts = [
      { mode: "Vanilla", count: 1247 },
      { mode: "UHC", count: 983 },
      { mode: "Sword", count: 2156 },
      { mode: "Axe", count: 876 },
      { mode: "SMP", count: 1543 },
      { mode: "Pot", count: 1120 },
      { mode: "LTMs", count: 634 },
    ];

    return {
      totalPlayers: playerCount.count,
      totalMatches: matchCount.count,
      gameModes: 7,
      modeBreakdown: modeCounts,
    };
  }),
});
