import type { MatchListItem } from "@contracts/match-history";
import WinnerInventoryDialog from "./WinnerInventoryDialog";

function renderNullable(value: string | number | null): string {
  if (value === null || value === "") return "Coming soon";
  return String(value);
}

function toTitleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9_:-]+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function renderPrettyText(value: string | number | null): string {
  const rendered = renderNullable(value);
  if (rendered === "Coming soon") return rendered;
  if (typeof value === "number") return rendered;
  return toTitleCase(rendered.replace(/_/g, " "));
}

function renderTimelineEntry(entry: string): string {
  const match = entry.match(/^(\d+:\d+)\s+(.*)$/);
  if (!match) return toTitleCase(entry);
  const [, timePrefix, description] = match;
  return `${timePrefix} ${toTitleCase(description)}`;
}

function parseTimelineEntry(entry: string): { time: string; description: string } {
  const formatted = renderTimelineEntry(entry);
  const match = formatted.match(/^(\d+:\d+)\s+(.*)$/);
  if (!match) {
    return { time: "--:--", description: formatted };
  }
  return {
    time: match[1],
    description: match[2],
  };
}

function timelineEventClasses(description: string): { dot: string; chip: string } {
  const lower = description.toLowerCase();
  if (lower.includes("victory") || lower.includes("won")) {
    return {
      dot: "bg-[#D6A437] ring-[rgba(214,164,55,0.42)]",
      chip: "border-[rgba(214,164,55,0.35)] bg-[rgba(214,164,55,0.14)] text-[#F6DC9C]",
    };
  }
  if (lower.includes("killed")) {
    return {
      dot: "bg-[#E25555] ring-[rgba(226,85,85,0.38)]",
      chip: "border-[rgba(226,85,85,0.35)] bg-[rgba(226,85,85,0.12)] text-[#FFC2C2]",
    };
  }
  if (lower.includes("nether") || lower.includes("end")) {
    return {
      dot: "bg-[#B86EFF] ring-[rgba(184,110,255,0.35)]",
      chip: "border-[rgba(184,110,255,0.35)] bg-[rgba(184,110,255,0.14)] text-[#DFC3FF]",
    };
  }
  return {
    dot: "bg-[#70A4FF] ring-[rgba(112,164,255,0.34)]",
    chip: "border-[rgba(112,164,255,0.32)] bg-[rgba(112,164,255,0.12)] text-[#C9DCFF]",
  };
}

function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds === null) return "Coming soon";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type Props = {
  match: MatchListItem;
};

export default function MatchHistoryExpanded({ match }: Props) {
  return (
    <div className="mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#6A6A74] mb-3">Battle Breakdown</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Meta label="Match Duration" value={formatDuration(match.matchDurationSeconds)} />
        <Meta label="Players Joined" value={renderNullable(match.playersJoined)} />
        <Meta label="Placement" value={renderNullable(match.placement ? `#${match.placement}` : "1")} />
        <Meta label="Kills" value={renderNullable(match.kills)} />
        <Meta label="Damage Dealt" value={renderNullable(match.damageDealt)} />
        <Meta label="Damage Taken" value={renderNullable(match.damageTaken)} />
        <Meta label="Survival Time" value={formatDuration(match.survivalTimeSeconds)} />
        <Meta label="Kit / Class" value={renderPrettyText(match.kitUsed)} />
        <Meta label="Best Weapon" value={renderPrettyText(match.bestWeapon)} />
        <Meta label="Armor Tier" value={renderPrettyText(match.highestArmorTier)} />
      </div>

      <div className="space-y-3">
        <div className="bg-[#0F0F13] border border-[rgba(255,255,255,0.05)] rounded-lg p-3">
          <p className="text-[12px] uppercase tracking-[0.08em] text-[#8A8A95] mb-2">Combat Timeline</p>
          {match.timelineEvents.length > 0 ? (
            <div className="overflow-x-auto pb-1">
              <div className="relative flex min-w-max gap-5 pr-2 pt-1">
                {match.timelineEvents.slice(0, 12).map((entry, idx, arr) => {
                  const parsed = parseTimelineEntry(entry);
                  const tone = timelineEventClasses(parsed.description);
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={`${entry}-${idx}`} className="relative w-[176px] shrink-0">
                      <div className="mb-2">
                        <span className={`inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.25)] ${tone.chip}`}>
                          {parsed.time}
                        </span>
                      </div>
                      <div className="relative mb-2 h-4">
                        <span className={`absolute left-1 top-1 h-2.5 w-2.5 rounded-full ring-4 ${tone.dot}`} />
                        {!isLast ? (
                          <div className="pointer-events-none absolute left-4 top-[7px] h-[2px] w-[calc(100%+0.9rem)] bg-[linear-gradient(90deg,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.08)_100%)]" />
                        ) : null}
                      </div>
                      <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)] px-2.5 py-2 text-[12px] leading-snug text-[#C2C2D0] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        {parsed.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <ul className="space-y-1.5 text-[13px] text-[#A0A0AD]">
              <li>No timeline events were captured for this match.</li>
            </ul>
          )}
        </div>
        <div className="bg-[#0F0F13] border border-[rgba(255,255,255,0.05)] rounded-lg p-3">
          <p className="text-[12px] uppercase tracking-[0.08em] text-[#8A8A95] mb-2">Gear Progression</p>
          <ul className="space-y-1.5 text-[13px] text-[#A0A0AD]">
            <li>Best Weapon: {renderPrettyText(match.bestWeapon)}</li>
            <li>Highest Armor Tier: {renderPrettyText(match.highestArmorTier)}</li>
            <li>Total Healing Used: {renderNullable(match.totalHealingUsed)}</li>
          </ul>
        </div>
      </div>

      <div className="mt-3 bg-[#0F0F13] border border-[rgba(255,255,255,0.05)] rounded-lg p-3">
        <WinnerInventoryDialog
          inventory={match.winnerInventory}
          winnerName={match.playerUsername ?? "Unknown Winner"}
        />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0F0F13] border border-[rgba(255,255,255,0.05)] rounded-lg px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5A5A65] mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-[#E2E2E8]">{value}</p>
    </div>
  );
}

