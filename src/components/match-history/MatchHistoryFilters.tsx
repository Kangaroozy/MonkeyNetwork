import type { MatchDateWindow } from "@contracts/match-history";

type ModeOption = {
  slug: string;
  name: string;
};

type Props = {
  modes: ModeOption[];
  mode: string;
  dateWindow: MatchDateWindow;
  onModeChange: (nextMode: string) => void;
  onDateWindowChange: (nextWindow: MatchDateWindow) => void;
};

const DATE_WINDOW_OPTIONS: Array<{ value: MatchDateWindow; label: string }> = [
  { value: "all", label: "All time" },
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7d" },
  { value: "30d", label: "Last 30d" },
];

export default function MatchHistoryFilters({
  modes,
  mode,
  dateWindow,
  onModeChange,
  onDateWindowChange,
}: Props) {
  return (
    <div className="relative bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 mb-6 overflow-hidden">
      <div className="absolute -top-20 right-0 w-48 h-48 bg-[#D4A843]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#5A5A65] mb-2">Mode</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => onModeChange("")}
            className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
            style={{
              color: mode === "" ? "#F0F0F2" : "#8A8A95",
              borderColor: mode === "" ? "rgba(212,168,67,0.7)" : "rgba(255,255,255,0.08)",
              backgroundColor: mode === "" ? "rgba(212,168,67,0.12)" : "transparent",
            }}
          >
            All BR Modes
          </button>
          {modes.map((entry) => (
            <button
              key={entry.slug}
              onClick={() => onModeChange(entry.slug)}
              className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
              style={{
                color: mode === entry.slug ? "#F0F0F2" : "#8A8A95",
                borderColor: mode === entry.slug ? "rgba(212,168,67,0.7)" : "rgba(255,255,255,0.08)",
                backgroundColor: mode === entry.slug ? "rgba(212,168,67,0.12)" : "transparent",
              }}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-[#5A5A65] mb-2">Time Range</p>
        <div className="flex flex-wrap gap-2">
          {DATE_WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateWindowChange(option.value)}
              className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
              style={{
                color: dateWindow === option.value ? "#F0F0F2" : "#8A8A95",
                borderColor: dateWindow === option.value ? "rgba(155,89,182,0.8)" : "rgba(255,255,255,0.08)",
                backgroundColor: dateWindow === option.value ? "rgba(155,89,182,0.15)" : "transparent",
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

