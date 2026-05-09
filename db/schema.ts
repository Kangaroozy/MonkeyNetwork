import {
  binary,
  bigint,
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  serial,
  text,
  timestamp,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const CLASH_TRIM_OPTIONS = [
  "SENTRY",
  "VEX",
  "WILD",
  "COAST",
  "DUNE",
  "WAYFINDER",
  "RAISER",
  "SHAPER",
  "HOST",
  "WARD",
  "SILENCE",
  "TIDE",
  "SNOUT",
  "RIB",
  "EYE",
  "SPIRE",
] as const;

export const CLASH_MATERIAL_OPTIONS = [
  "QUARTZ",
  "IRON",
  "NETHERITE",
  "REDSTONE",
  "COPPER",
  "GOLD",
  "EMERALD",
  "DIAMOND",
  "LAPIS",
  "AMETHYST",
] as const;

export const CLASH_AUDIT_ACTION_OPTIONS = [
  "CLAN_CREATED",
  "CLAN_UPDATED",
  "CLAN_DELETED",
  "MEMBER_ADDED",
  "MEMBER_REMOVED",
  "MEMBER_MOVED",
  "LEADER_CHANGED",
  "LOCK_UPDATED",
] as const;

export const CLASH_MEMBER_SOURCE_OPTIONS = ["PLAYER", "ADMIN", "PLUGIN_SYNC"] as const;
export const CLASH_ACCOUNT_ROLE_OPTIONS = ["USER", "ADMIN"] as const;
export const CLASH_REVIEW_STATUS_OPTIONS = ["PENDING", "APPROVED", "DECLINED"] as const;
export const CLASH_COLOR_OPTIONS = [
  "BLACK",
  "DARK_BLUE",
  "DARK_GREEN",
  "DARK_AQUA",
  "DARK_RED",
  "DARK_PURPLE",
  "GOLD",
  "GRAY",
  "DARK_GRAY",
  "BLUE",
  "GREEN",
  "AQUA",
  "RED",
  "LIGHT_PURPLE",
  "YELLOW",
  "WHITE",
] as const;

export const clashAccounts = mysqlTable(
  "clash_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    minecraftUsername: varchar("minecraft_username", { length: 16 }).notNull(),
    usernameKey: varchar("username_key", { length: 16 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: mysqlEnum("role", CLASH_ACCOUNT_ROLE_OPTIONS).notNull().default("USER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    usernameUniqueIdx: uniqueIndex("clash_accounts_username_unique").on(table.minecraftUsername),
    usernameKeyUniqueIdx: uniqueIndex("clash_accounts_username_key_unique").on(table.usernameKey),
  }),
);

export const clashEvents = mysqlTable(
  "clash_events",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 96 }).notNull(),
    maxMembersPerClan: int("max_members_per_clan").notNull().default(10),
    lockAt: timestamp("lock_at"),
    isActive: tinyint("is_active").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("clash_events_slug_unique").on(table.slug),
    activeIdx: index("clash_events_active_idx").on(table.isActive),
  }),
);

export const clashClans = mysqlTable(
  "clash_clans",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id").notNull().references(() => clashEvents.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    leaderDiscordUserId: varchar("leader_discord_user_id", { length: 32 }).notNull(),
    discordServerLink: varchar("discord_server_link", { length: 255 }),
    reviewStatus: mysqlEnum("review_status", CLASH_REVIEW_STATUS_OPTIONS).notNull().default("APPROVED"),
    reviewDeclineReason: varchar("review_decline_reason", { length: 255 }),
    reviewedByAccountId: varchar("reviewed_by_account_id", { length: 32 }),
    reviewedAt: timestamp("reviewed_at"),
    trim: mysqlEnum("trim", CLASH_TRIM_OPTIONS).notNull().default("SENTRY"),
    material: mysqlEnum("material", CLASH_MATERIAL_OPTIONS).notNull().default("IRON"),
    color: mysqlEnum("color", CLASH_COLOR_OPTIONS).notNull().default("WHITE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    eventNameUniqueIdx: uniqueIndex("clash_clans_event_name_unique").on(table.eventId, table.name),
    eventLeaderIdx: index("clash_clans_event_leader_idx").on(table.eventId, table.leaderDiscordUserId),
  }),
);

export const clashClanMembers = mysqlTable(
  "clash_clan_members",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id").notNull().references(() => clashEvents.id, { onDelete: "cascade" }),
    clanId: int("clan_id").notNull().references(() => clashClans.id, { onDelete: "cascade" }),
    discordUserId: varchar("discord_user_id", { length: 32 }),
    discordUsername: varchar("discord_username", { length: 64 }),
    minecraftName: varchar("minecraft_name", { length: 16 }).notNull(),
    isLeader: tinyint("is_leader").notNull().default(0),
    source: mysqlEnum("source", CLASH_MEMBER_SOURCE_OPTIONS).notNull().default("PLAYER"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => ({
    eventMinecraftNameUniqueIdx: uniqueIndex("clash_members_event_mcname_unique").on(
      table.eventId,
      table.minecraftName,
    ),
    eventDiscordUniqueIdx: uniqueIndex("clash_members_event_discord_unique").on(
      table.eventId,
      table.discordUserId,
    ),
    clanMinecraftNameUniqueIdx: uniqueIndex("clash_members_clan_mcname_unique").on(
      table.clanId,
      table.minecraftName,
    ),
    clanLeaderIdx: index("clash_members_clan_leader_idx").on(table.clanId, table.isLeader),
  }),
);

export const clashRosterAudit = mysqlTable(
  "clash_roster_audit",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id").notNull().references(() => clashEvents.id, { onDelete: "cascade" }),
    clanId: int("clan_id").references(() => clashClans.id, { onDelete: "set null" }),
    actorDiscordUserId: varchar("actor_discord_user_id", { length: 32 }),
    actorDisplayName: varchar("actor_display_name", { length: 64 }),
    action: mysqlEnum("action", CLASH_AUDIT_ACTION_OPTIONS).notNull(),
    payloadJson: text("payload_json").notNull().default(sql`'{}'`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    eventCreatedAtIdx: index("clash_audit_event_created_idx").on(table.eventId, table.createdAt),
  }),
);

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

export const uhcMatch = mysqlTable("uhc_match", {
  matchId: binary("match_id", { length: 16 }).primaryKey(),
  hostUuid: binary("host_uuid", { length: 16 }).notNull(),
  state: varchar("state", { length: 16 }).notNull(),
  configJson: text("config_json").notNull(),
  createdAt: timestamp("created_at").notNull(),
  gameStartedAt: timestamp("game_started_at"),
  endedAt: timestamp("ended_at"),
});

export const matchRoster = mysqlTable("match_roster", {
  matchId: binary("match_id", { length: 16 }).notNull(),
  playerUuid: binary("player_uuid", { length: 16 }).notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  readyFlag: tinyint("ready_flag").notNull().default(0),
  joinedAt: timestamp("joined_at").notNull(),
  connectionStatus: varchar("connection_status", { length: 16 }).notNull(),
});

export const playerMatchStats = mysqlTable("player_match_stats", {
  matchId: binary("match_id", { length: 16 }).notNull(),
  playerUuid: binary("player_uuid", { length: 16 }).notNull(),
  gamemodeKey: varchar("gamemode_key", { length: 64 }).notNull(),
  kitKey: varchar("kit_key", { length: 32 }).notNull(),
  wins: int("wins").notNull().default(0),
  losses: int("losses").notNull().default(0),
  kills: int("kills").notNull().default(0),
  deaths: int("deaths").notNull().default(0),
  assists: int("assists").notNull().default(0),
  matchesPlayed: int("matches_played").notNull().default(1),
  recordedAt: timestamp("recorded_at").notNull(),
});
