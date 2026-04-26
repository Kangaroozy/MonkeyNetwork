export const TIER_COLORS: Record<string, string> = {
  HT1: "#FFD700",
  HT2: "#C0C0C0",
  HT3: "#CD7F32",
  HT4: "#9B59B6",
  HT5: "#3498DB",
  LT1: "#2ECC71",
  LT2: "#E67E22",
  LT3: "#E74C3C",
  UNRANKED: "#5A5A65",
};

export const MODE_COLORS: Record<string, string> = {
  overall: "#C4FF4D",
  vanilla: "#2ECC71",
  uhc: "#9B59B6",
  sword: "#E74C3C",
  axe: "#3498DB",
  smp: "#C4FF4D",
  pot: "#E74C3C",
  ltms: "#9B59B6",
};

export const MODE_LABELS: Record<string, string> = {
  overall: "Overall",
  vanilla: "Vanilla",
  uhc: "UHC",
  sword: "Sword",
  axe: "Axe",
  smp: "SMP",
  pot: "Pot",
  ltms: "LTMs",
};

export const MODES = ["overall", "vanilla", "uhc", "sword", "axe", "smp", "pot", "ltms"] as const;

export function modeLabel(mode: string): string {
  if (MODE_LABELS[mode]) {
    return MODE_LABELS[mode];
  }
  return mode
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function modeColor(mode: string): string {
  return MODE_COLORS[mode] ?? "#7D7D88";
}

export function getTierColor(tier: string | null): string {
  return TIER_COLORS[tier || "UNRANKED"] || "#5A5A65";
}

export function getTierBgColor(tier: string | null): string {
  const color = getTierColor(tier);
  return color + "26";
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "-";
  return num.toLocaleString();
}

export function formatWinRate(rate: number | string | null | undefined): string {
  if (rate === null || rate === undefined) return "0%";
  const num = typeof rate === "string" ? parseFloat(rate) : rate;
  return `${(num * 100).toFixed(1)}%`;
}

export function getTrendIcon(trend: number | null | undefined): "up" | "down" | "neutral" {
  if (trend === null || trend === undefined) return "neutral";
  if (trend > 0) return "up";
  if (trend < 0) return "down";
  return "neutral";
}
