const NAME_COLOR_DEFAULT = "#8a8a8a";

const RANK_ICON_BY_GROUP: Record<string, string> = {
  default: "/assets/rank-icons/rank_default.png",
  vip: "/assets/rank-icons/rank_vip_base.png",
  "vip+": "/assets/rank-icons/rank_vip_base.png",
  developer: "/assets/rank-icons/rank_developer.png",
  booster: "/assets/rank-icons/rank_booster.png",
  helper: "/assets/rank-icons/rank_helper.png",
  moderator: "/assets/rank-icons/rank_mod.png",
  mod: "/assets/rank-icons/rank_mod.png",
  owner: "/assets/rank-icons/rank_owner.png",
  admin: "/assets/rank-icons/rank_admin.png",
  media: "/assets/rank-icons/rank_media.png",
  mediaplus: "/assets/rank-icons/rank_media.png",
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
  starIcon: string;
};

const LEVEL_PALETTES: LevelPalette[] = [
  { minLevel: 1000, levelColor: "#ff55ff", starColor: "#ff55ff", starIcon: "/assets/star-icons/star_rainbow.png" },
  { minLevel: 900, levelColor: "#aa0000", starColor: "#aa0000", starIcon: "/assets/star-icons/star_dark_red.png" },
  { minLevel: 800, levelColor: "#aa00aa", starColor: "#aa00aa", starIcon: "/assets/star-icons/star_purple.png" },
  { minLevel: 700, levelColor: "#5555ff", starColor: "#5555ff", starIcon: "/assets/star-icons/star_blue.png" },
  { minLevel: 600, levelColor: "#55ffff", starColor: "#55ffff", starIcon: "/assets/star-icons/star_aqua.png" },
  { minLevel: 500, levelColor: "#ff5fc8", starColor: "#ff5fc8", starIcon: "/assets/star-icons/star_pink.png" },
  { minLevel: 400, levelColor: "#55ff55", starColor: "#55ff55", starIcon: "/assets/star-icons/star_green.png" },
  { minLevel: 300, levelColor: "#ffaa00", starColor: "#ffaa00", starIcon: "/assets/star-icons/star_orange.png" },
  { minLevel: 200, levelColor: "#ffff55", starColor: "#ffff55", starIcon: "/assets/star-icons/star_yellow.png" },
  { minLevel: 100, levelColor: "#ffffff", starColor: "#ffffff", starIcon: "/assets/star-icons/star_white.png" },
  { minLevel: 0, levelColor: "#aaaaaa", starColor: "#aaaaaa", starIcon: "/assets/star-icons/star_gray.png" },
];

function normalizeRank(rankKey: string | null | undefined): string {
  return (rankKey ?? "default")
    .trim()
    .toLowerCase()
    .replace(/^rank[_-]/, "")
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function resolveLevelPalette(level: number | null | undefined): LevelPalette {
  const safeLevel = Number.isFinite(level) ? Number(level) : 1;
  return LEVEL_PALETTES.find((entry) => safeLevel >= entry.minLevel) ?? LEVEL_PALETTES[LEVEL_PALETTES.length - 1];
}

export function getRankIconPath(rankKey: string | null | undefined): string {
  const group = normalizeRank(rankKey);
  const direct = RANK_ICON_BY_GROUP[group];
  if (direct) {
    return direct;
  }
  if (group === "default" || group.length === 0) {
    return "/assets/rank-icons/rank_default.png";
  }
  if (group.includes("vip")) {
    return "/assets/rank-icons/rank_vip_base.png";
  }
  if (group.includes("dev")) {
    return "/assets/rank-icons/rank_developer.png";
  }
  if (group.includes("boost")) {
    return "/assets/rank-icons/rank_booster.png";
  }
  if (group.includes("helper")) {
    return "/assets/rank-icons/rank_helper.png";
  }
  if (group.includes("media") || group.includes("youtube") || group.includes("twitch")) {
    return "/assets/rank-icons/rank_media.png";
  }
  if (group.includes("mod")) {
    return "/assets/rank-icons/rank_mod.png";
  }
  if (group.includes("admin")) {
    return "/assets/rank-icons/rank_admin.png";
  }
  if (group.includes("owner")) {
    return "/assets/rank-icons/rank_owner.png";
  }
  return "/assets/rank-icons/rank_default.png";
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

export function getStarIconPath(level: number | null | undefined): string {
  return resolveLevelPalette(level).starIcon;
}
