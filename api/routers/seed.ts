import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { players, rankings, matches, tierHistory, gameModes } from "@db/schema";
import { sql } from "drizzle-orm";

const REGIONS = ["NA", "EU", "AS", "SA", "OC", "AF"] as const;
const TIERS = ["HT1", "HT2", "HT3", "HT4", "HT5", "LT1", "LT2", "LT3", "UNRANKED"] as const;
const MODE_SLUGS = ["vanilla", "uhc", "sword", "axe", "smp", "pot", "ltms"] as const;
const MODE_NAMES = ["Vanilla", "UHC", "Sword", "Axe", "SMP", "Pot", "LTMs"] as const;
const MODE_COLORS = ["#2ECC71", "#9B59B6", "#E74C3C", "#3498DB", "#D4A843", "#E74C3C", "#9B59B6"] as const;

const USERNAMES = [
  "xNestorio", "Technoblade", "Dream", "Fruitberries", "Illumina",
  "TapL", "Wallibear", "Purpled", "TommyInnit", "Tubbo",
  "Sapnap", "GeorgeNotFound", "WilburSoot", "Philza", "Ranboo",
  "Sneegsnag", "5up", "Antfrost", "BadBoyHalo", "CaptainPuffy",
  "ConnorEatsPants", "Fundy", "HBomb94", "JackManifold",
  "KarlJacobs", "Nihachu", "Punz", "Quackity",
  "Skeppy", "Slimecicle",
];

function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min: number, max: number) { return Math.random() * (max - min) + min; }
function pickRandom<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function pickTier(): string {
  const weights = [0.02, 0.05, 0.08, 0.12, 0.15, 0.20, 0.18, 0.12, 0.08];
  const r = Math.random(); let cum = 0;
  for (let i = 0; i < TIERS.length; i++) { cum += weights[i]; if (r < cum) return TIERS[i]; }
  return "UNRANKED";
}

function tierPoints(tier: string): number {
  const map: Record<string, number> = { HT1: 2500, HT2: 2200, HT3: 1950, HT4: 1700, HT5: 1500, LT1: 1300, LT2: 1100, LT3: 900, UNRANKED: 0 };
  return map[tier] ?? 0;
}

export const seedRouter = createRouter({
  run: publicQuery
    .input(z.object({ key: z.string() }).optional())
    .mutation(async () => {
      const db = getDb();

      await db.delete(tierHistory);
      await db.delete(matches);
      await db.delete(rankings);
      await db.delete(players);
      await db.delete(gameModes);

      await db.insert(gameModes).values(
        MODE_SLUGS.map((slug, i) => ({ slug, name: MODE_NAMES[i], accentColor: MODE_COLORS[i], description: `Competitive ${MODE_NAMES[i]} PvP rankings` }))
      );

      const modeRecords = await db.select().from(gameModes);
      const modeIdMap = new Map(modeRecords.map(m => [m.slug, m.id]));

      for (const username of USERNAMES) {
        const overallTier = pickTier();
        const matchesPlayed = randomInt(50, 2000);
        const wins = Math.floor(matchesPlayed * randomFloat(0.3, 0.75));
        await db.insert(players).values({
          username,
          avatarUrl: `https://mc-heads.net/avatar/${username}`,
          region: pickRandom(REGIONS),
          currentTier: overallTier,
          highestTier: Math.random() > 0.3 ? overallTier : pickTier(),
          globalRank: null,
          totalPoints: tierPoints(overallTier) + randomInt(0, 300),
          totalWins: wins,
          totalLosses: matchesPlayed - wins,
          winRate: (wins / matchesPlayed).toFixed(4),
          matchesPlayed,
          bestStreak: randomInt(3, 25),
        });
      }

      const allPlayers = await db.select({ id: players.id, totalPoints: players.totalPoints }).from(players).orderBy(sql`${players.totalPoints} DESC`);
      for (let i = 0; i < allPlayers.length; i++) {
        await db.update(players).set({ globalRank: i + 1 }).where(sql`${players.id} = ${allPlayers[i].id}`);
      }

      for (const player of allPlayers) {
        for (const modeSlug of MODE_SLUGS) {
          const modeId = modeIdMap.get(modeSlug);
          if (!modeId) continue;
          const tier = pickTier();
          const modeMatches = randomInt(10, 500);
          const modeWins = Math.floor(modeMatches * randomFloat(0.3, 0.75));
          await db.insert(rankings).values({
            playerId: player.id,
            modeId,
            tier,
            points: tierPoints(tier) + randomInt(0, 200),
            wins: modeWins,
            losses: modeMatches - modeWins,
            winRate: (modeWins / modeMatches).toFixed(4),
            trend: randomInt(-50, 50),
            matchesPlayed: modeMatches,
            bestStreak: randomInt(2, 20),
          });
        }
      }

      for (const modeSlug of MODE_SLUGS) {
        const modeId = modeIdMap.get(modeSlug);
        if (!modeId) continue;
        const modeRankingsList = await db.select({ id: rankings.id }).from(rankings).where(sql`${rankings.modeId} = ${modeId}`).orderBy(sql`${rankings.points} DESC`);
        for (let i = 0; i < modeRankingsList.length; i++) {
          await db.update(rankings).set({ rankPosition: i + 1 }).where(sql`${rankings.id} = ${modeRankingsList[i].id}`);
        }
      }

      for (const player of allPlayers) {
        for (let m = 0; m < randomInt(5, 15); m++) {
          const opponent = pickRandom(allPlayers);
          if (opponent.id === player.id) continue;
          const modeSlug = pickRandom(MODE_SLUGS);
          const modeId = modeIdMap.get(modeSlug);
          if (!modeId) continue;
          const r = Math.random();
          await db.insert(matches).values({
            playerId: player.id,
            opponentId: opponent.id,
            opponentName: USERNAMES.find((_, idx) => allPlayers[idx]?.id === opponent.id) || "Unknown",
            modeId,
            result: (r < 0.45 ? "WIN" : r < 0.9 ? "LOSS" : "DRAW") as "WIN" | "LOSS" | "DRAW",
            playerScore: randomInt(0, 10),
            opponentScore: randomInt(0, 10),
            tierChange: Math.random() > 0.8 ? pickTier() : null,
            playedAt: new Date(Date.now() - randomInt(0, 90) * 86400000),
          });
        }
      }

      for (const player of allPlayers) {
        for (let t = 0; t < randomInt(1, 3); t++) {
          const modeSlug = pickRandom(MODE_SLUGS);
          const modeId = modeIdMap.get(modeSlug);
          if (!modeId) continue;
          const oldTier = pickTier();
          let newTier = pickTier();
          while (newTier === oldTier) newTier = pickTier();
          await db.insert(tierHistory).values({
            playerId: player.id,
            modeId,
            oldTier,
            newTier,
            changedAt: new Date(Date.now() - randomInt(7, 365) * 86400000),
          });
        }
      }

      return {
        success: true,
        players: USERNAMES.length,
        message: "Database seeded successfully",
      };
    }),
});
