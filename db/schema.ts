import {
  binary,
  mysqlTable,
  serial,
  varchar,
  int,
  decimal,
  timestamp,
  bigint,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const players = mysqlTable("players", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  region: mysqlEnum("region", ["NA", "EU", "AS", "SA", "OC", "AF"]).notNull(),
  joinDate: timestamp("join_date").notNull().defaultNow(),
  currentTier: varchar("current_tier", { length: 8 }).notNull().default("UNRANKED"),
  highestTier: varchar("highest_tier", { length: 8 }).notNull().default("UNRANKED"),
  globalRank: int("global_rank"),
  totalPoints: int("total_points").notNull().default(0),
  totalWins: int("total_wins").notNull().default(0),
  totalLosses: int("total_losses").notNull().default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  matchesPlayed: int("matches_played").notNull().default(0),
  bestStreak: int("best_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gameModes = mysqlTable("game_modes", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 16 }).notNull().unique(),
  name: varchar("name", { length: 32 }).notNull(),
  accentColor: varchar("accent_color", { length: 7 }).notNull(),
  description: varchar("description", { length: 255 }),
});

export const rankings = mysqlTable("rankings", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  modeId: bigint("mode_id", { mode: "number", unsigned: true }).notNull(),
  tier: varchar("tier", { length: 8 }).notNull().default("UNRANKED"),
  points: int("points").notNull().default(0),
  wins: int("wins").notNull().default(0),
  losses: int("losses").notNull().default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 4 }).notNull().default("0.5000"),
  trend: int("trend").notNull().default(0),
  rankPosition: int("rank_position"),
  matchesPlayed: int("matches_played").notNull().default(0),
  bestStreak: int("best_streak").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matches = mysqlTable("matches", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  opponentId: bigint("opponent_id", { mode: "number", unsigned: true }).notNull(),
  opponentName: varchar("opponent_name", { length: 32 }).notNull(),
  modeId: bigint("mode_id", { mode: "number", unsigned: true }).notNull(),
  result: mysqlEnum("result", ["WIN", "LOSS", "DRAW"]).notNull(),
  playerScore: int("player_score").notNull().default(0),
  opponentScore: int("opponent_score").notNull().default(0),
  tierChange: varchar("tier_change", { length: 8 }),
  playedAt: timestamp("played_at").notNull().defaultNow(),
});

export const tierHistory = mysqlTable("tier_history", {
  id: serial("id").primaryKey(),
  playerId: bigint("player_id", { mode: "number", unsigned: true }).notNull(),
  modeId: bigint("mode_id", { mode: "number", unsigned: true }).notNull(),
  oldTier: varchar("old_tier", { length: 8 }).notNull(),
  newTier: varchar("new_tier", { length: 8 }).notNull(),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const playerProfile = mysqlTable("player_profile", {
  uniqueId: binary("unique_id", { length: 16 }).primaryKey(),
  identityKey: varchar("identity_key", { length: 64 }).notNull(),
  rank: varchar("rank", { length: 32 }).notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const playerNameHistory = mysqlTable("player_name_history", {
  uniqueId: binary("unique_id", { length: 16 }).notNull(),
  playerName: varchar("player_name", { length: 16 }).notNull(),
  firstSeen: timestamp("first_seen").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
});

export const playerWebProfile = mysqlTable("player_web_profile", {
  uniqueId: binary("unique_id", { length: 16 }).notNull(),
  playerName: varchar("player_name", { length: 16 }).notNull(),
  skinUrl: varchar("skin_url", { length: 512 }),
  updatedAt: timestamp("updated_at").notNull(),
});

export const playerStatsModeAll = mysqlTable("player_stats_mode_all", {
  playerUuid: binary("player_uuid", { length: 16 }).notNull(),
  gamemodeKey: varchar("gamemode_key", { length: 64 }).notNull(),
  wins: int("wins").notNull().default(0),
  losses: int("losses").notNull().default(0),
  kills: int("kills").notNull().default(0),
  deaths: int("deaths").notNull().default(0),
  assists: int("assists").notNull().default(0),
  matchesPlayed: int("matches_played").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull(),
});

export const playerStatsModeKit = mysqlTable("player_stats_mode_kit", {
  playerUuid: binary("player_uuid", { length: 16 }).notNull(),
  gamemodeKey: varchar("gamemode_key", { length: 64 }).notNull(),
  kitKey: varchar("kit_key", { length: 32 }).notNull(),
  wins: int("wins").notNull().default(0),
  losses: int("losses").notNull().default(0),
  kills: int("kills").notNull().default(0),
  deaths: int("deaths").notNull().default(0),
  assists: int("assists").notNull().default(0),
  matchesPlayed: int("matches_played").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull(),
});
