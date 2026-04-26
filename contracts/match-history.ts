export const MATCH_DATE_WINDOWS = ["24h", "7d", "30d", "all"] as const;
export type MatchDateWindow = (typeof MATCH_DATE_WINDOWS)[number];

export const MATCH_RESULTS = ["WIN", "LOSS", "DRAW"] as const;
export type MatchResult = (typeof MATCH_RESULTS)[number];

export type MatchSortBy = "recent";
export type MatchSortOrder = "desc";

export interface AdvancedStatsAvailability {
  timeline: boolean;
  combatBreakdown: boolean;
  movementBreakdown: boolean;
  socialGraph: boolean;
  ratingImpact: boolean;
  partyInfo: boolean;
  advancedInventory: boolean;
}

export type InventoryLayoutType = "player_inventory" | "chest";

export interface ItemEnchantment {
  key: string;
  level: number;
}

export interface WinnerInventorySlotItem {
  slotKey: string;
  slotIndex: number;
  material: string;
  amount: number;
  displayName: string;
  lore: string[];
  enchantments: ItemEnchantment[];
  customModelData: number | null;
  damage: number | null;
  unbreakable: boolean;
  itemFlags: string[];
  customKeyCandidates: string[];
}

export interface WinnerInventorySnapshot {
  version: number;
  layout: InventoryLayoutType;
  source: "v2" | "legacy";
  capturedAtEpochMs: number | null;
  items: WinnerInventorySlotItem[];
}

export interface MatchFilters {
  playerId?: number;
  playerUsername?: string;
  mode?: string;
  winsOnly: boolean;
  dateWindow: MatchDateWindow;
  sortBy: MatchSortBy;
  sortOrder: MatchSortOrder;
  limit: number;
  offset: number;
}

export interface MatchListItem {
  id: string;
  matchPublicId: string | null;
  playerId: number | null;
  playerUsername: string | null;
  playerAvatarUrl: string | null;
  playerRankKey: string | null;
  playerLevel: number | null;
  opponentId: number | null;
  opponentName: string;
  modeSlug: string;
  modeName: string;
  result: MatchResult;
  playerScore: number;
  opponentScore: number;
  tierChange: string | null;
  playedAt: Date;
  teamSize: number | null;
  playersJoined: number | null;
  matchDurationSeconds: number | null;
  placement: number | null;
  kills: number | null;
  damageDealt: number | null;
  damageTaken: number | null;
  survivalTimeSeconds: number | null;
  kitUsed: string | null;
  bestWeapon: string | null;
  highestArmorTier: string | null;
  totalHealingUsed: number | null;
  finalKillBy: string | null;
  finalDeathBy: string | null;
  timelineEvents: string[];
  winnerInventoryItems: string[];
  winnerInventory: WinnerInventorySnapshot | null;
}

export interface MatchListResponse {
  items: MatchListItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  capabilities: AdvancedStatsAvailability;
}

