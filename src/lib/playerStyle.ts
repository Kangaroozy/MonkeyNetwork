const NAME_COLOR_DEFAULT = "#8a8a8a";

const RANK_EMOJI_BY_GROUP: Record<string, string> = {
  vip: "⭐",
  "vip+": "⭐",
  developer: "💻",
  booster: "⚡",
  helper: "🛠️",
  moderator: "🛡️",
  mod: "🛡️",
  owner: "👑",
  admin: "🛡️",
  media: "🎥",
  mediaplus: "🎥",
};

const NAME_COLOR_BY_GROUP: Record<string, string> = {
  default: NAME_COLOR_DEFAULT,
  developer: "#fc1000",
  admin: "#fc1000",
  owner: "#ff5555",
  booster: "#55ffff",
  helper: "#2596be",
  moderator: "#2596be",
  mod: "#2596be",
  vip: "#2596be",
  "vip+": "#2596be",
  media: "#ff55ff",
  mediaplus: "#ff55ff",
};

type LevelPalette = {
  minLevel: number;
  levelColor: string;
  starColor: string;
};

const LEVEL_PALETTES: LevelPalette[] = [
  { minLevel: 1000, levelColor: "#ff55ff", starColor: "#ff55ff" },
  { minLevel: 900, levelColor: "#aa0000", starColor: "#aa0000" },
  { minLevel: 800, levelColor: "#aa00aa", starColor: "#aa00aa" },
  { minLevel: 700, levelColor: "#5555ff", starColor: "#5555ff" },
  { minLevel: 600, levelColor: "#55ffff", starColor: "#55ffff" },
  { minLevel: 500, levelColor: "#ff5fc8", starColor: "#ff5fc8" },
  { minLevel: 400, levelColor: "#55ff55", starColor: "#55ff55" },
  { minLevel: 300, levelColor: "#ffaa00", starColor: "#ffaa00" },
  { minLevel: 200, levelColor: "#ffff55", starColor: "#ffff55" },
  { minLevel: 100, levelColor: "#ffffff", starColor: "#ffffff" },
  { minLevel: 0, levelColor: "#aaaaaa", starColor: "#aaaaaa" },
];

function normalizeRank(rankKey: string | null | undefined): string {
  return (rankKey ?? "default").trim().toLowerCase();
}

function resolveLevelPalette(level: number | null | undefined): LevelPalette {
  const safeLevel = Number.isFinite(level) ? Number(level) : 1;
  return LEVEL_PALETTES.find((entry) => safeLevel >= entry.minLevel) ?? LEVEL_PALETTES[LEVEL_PALETTES.length - 1];
}

export function getRankEmoji(rankKey: string | null | undefined): string {
  const group = normalizeRank(rankKey);
  return RANK_EMOJI_BY_GROUP[group] ?? "";
}

export function getNameColor(rankKey: string | null | undefined): string {
  const group = normalizeRank(rankKey);
  return NAME_COLOR_BY_GROUP[group] ?? NAME_COLOR_DEFAULT;
}

export function getLevelColor(level: number | null | undefined): string {
  return resolveLevelPalette(level).levelColor;
}

export function getStarColor(level: number | null | undefined): string {
  return resolveLevelPalette(level).starColor;
}
