import { createRouter, publicQuery } from "./middleware";
import { playerRouter } from "./routers/player";
import { leaderboardRouter } from "./routers/leaderboard";
import { matchRouter } from "./routers/match";
import { statsRouter } from "./routers/stats";
import { seedRouter } from "./routers/seed";
import { clanRouter } from "./routers/clan";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  player: playerRouter,
  leaderboard: leaderboardRouter,
  match: matchRouter,
  stats: statsRouter,
  seed: seedRouter,
  clan: clanRouter,
});

export type AppRouter = typeof appRouter;
