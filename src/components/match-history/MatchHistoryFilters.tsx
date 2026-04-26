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
    <div className="relative bg-mn-moss border border-white/[0.08] rounded-2xl p-4 mb-6 overflow-hidden">
      <div className="absolute -top-20 right-0 w-48 h-48 bg-mn-lime/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-0 w-40 h-40 bg-mn-teal/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <p className="text-[11px] uppercase tracking-[0.12em] text-mn-dim mb-2">Mode</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => onModeChange("")}
            className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
            style={{
              color: mode === "" ? "#E8EDE5" : "#9BA39A",
              borderColor: mode === "" ? "rgba(196,255,77,0.55)" : "rgba(255,255,255,0.08)",
              backgroundColor: mode === "" ? "rgba(196,255,77,0.1)" : "transparent",
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
                color: mode === entry.slug ? "#E8EDE5" : "#9BA39A",
                borderColor: mode === entry.slug ? "rgba(196,255,77,0.55)" : "rgba(255,255,255,0.08)",
                backgroundColor: mode === entry.slug ? "rgba(196,255,77,0.1)" : "transparent",
              }}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-mn-dim mb-2">Time Range</p>
        <div className="flex flex-wrap gap-2">
          {DATE_WINDOW_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateWindowChange(option.value)}
              className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
              style={{
                color: dateWindow === option.value ? "#E8EDE5" : "#9BA39A",
                borderColor: dateWindow === option.value ? "rgba(46,196,182,0.65)" : "rgba(255,255,255,0.08)",
                backgroundColor: dateWindow === option.value ? "rgba(46,196,182,0.12)" : "transparent",
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

