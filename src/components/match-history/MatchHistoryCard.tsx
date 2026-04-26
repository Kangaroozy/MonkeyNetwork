import { useState } from "react";
import { Link } from "react-router";
import type { MatchListItem } from "@contracts/match-history";
import MatchHistoryExpanded from "./MatchHistoryExpanded";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";

type Props = {
  match: MatchListItem;
  showPrimaryPlayer?: boolean;
  compact?: boolean;
  view?: "global" | "player";
};

function getVisualTone(
  match: MatchListItem,
  view: "global" | "player",
): { border: string; glow: string; badge: string; label: string } {
  if (view === "global") {
    if ((match.kills ?? 0) >= 7) {
      return {
        border: "rgba(155, 89, 182, 0.9)",
        glow: "0 0 34px rgba(155, 89, 182, 0.18)",
        badge: "rgba(155, 89, 182, 0.2)",
        label: "High Kill Winner",
      };
    }
    return {
      border: "rgba(212, 168, 67, 0.85)",
      glow: "0 0 38px rgba(212, 168, 67, 0.18)",
      badge: "rgba(212, 168, 67, 0.2)",
      label: "Match Winner",
    };
  }
  if (match.result === "WIN") {
    return {
      border: "rgba(212, 168, 67, 0.85)",
      glow: "0 0 38px rgba(212, 168, 67, 0.18)",
      badge: "rgba(212, 168, 67, 0.2)",
      label: "#1 Victory",
    };
  }
  if ((match.kills ?? 0) >= 7) {
    return {
      border: "rgba(155, 89, 182, 0.9)",
      glow: "0 0 34px rgba(155, 89, 182, 0.18)",
      badge: "rgba(155, 89, 182, 0.2)",
      label: "High Kill Run",
    };
  }
  return {
    border: "rgba(231, 76, 60, 0.72)",
    glow: "0 0 30px rgba(231, 76, 60, 0.12)",
    badge: "rgba(231, 76, 60, 0.2)",
    label: "Eliminated",
  };
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "N/A";
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export default function MatchHistoryCard({ match, showPrimaryPlayer = true, compact = false, view = "global" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tone = getVisualTone(match, view);
  const playedAt = new Date(match.playedAt);
  const shortMatchId = (match.matchPublicId ?? match.id).slice(0, 8).toUpperCase();
  const killsOrScore = match.kills ?? match.playerScore;
  const entrants = match.playersJoined ?? 0;
  const killedByName = (match.finalKillBy ?? match.opponentName ?? "").trim();

  return (
    <div
      className="relative overflow-hidden bg-[#111114] border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:bg-[#16161C]"
      style={{ borderColor: tone.border, boxShadow: tone.glow }}
    >
      <div className="absolute -top-10 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: tone.badge }} />

      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-full text-[#F0F0F2]" style={{ backgroundColor: tone.badge }}>
              {tone.label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-full bg-[rgba(255,255,255,0.08)] text-[#CFCFD6]">
              {match.modeName}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-[#5A5A65] shrink-0">Match {shortMatchId}</span>
        </div>

        {view === "global" && (
          <div className="mb-4 flex justify-center">
            <WinnerBlock match={match} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <Metric label="Kills" value={String(killsOrScore)} />
          <Metric label="Total Players" value={entrants > 0 ? String(entrants) : "N/A"} />
          <Metric label="Duration" value={formatDuration(match.matchDurationSeconds)} />
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] text-[#A8A8B2]">
              {playedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at{" "}
              {playedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
            {view !== "global" && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px]">
                <>
                  {showPrimaryPlayer && match.playerUsername && (
                    <>
                      <span className="text-[#6E6E79]">Player:</span>
                      <Link to={`/player/${encodeURIComponent(match.playerUsername)}`} className="text-[#D4A843] hover:underline font-medium">
                        {match.playerUsername}
                      </Link>
                    </>
                  )}
                  {match.result !== "WIN" && killedByName.length > 0 ? (
                    <>
                      <span className="text-[#6E6E79]">{showPrimaryPlayer && match.playerUsername ? "• Killed By:" : "Killed By:"}</span>
                      <Link to={`/player/${encodeURIComponent(killedByName)}`} className="text-[#F0F0F2] hover:underline font-medium">
                        {killedByName}
                      </Link>
                    </>
                  ) : null}
                </>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#7A7A86]">
              Team Size {match.teamSize ?? "N/A"}
            </span>
            {!compact && (
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="px-3 py-2 text-[12px] rounded-lg border border-[rgba(255,255,255,0.12)] text-[#D0D0D7] hover:text-[#F0F0F2] hover:bg-[#1A1A1F] transition-colors"
              >
                {expanded ? "Hide Details" : "Match Breakdown"}
              </button>
            )}
          </div>
        </div>
      </div>

      {!compact && expanded && <MatchHistoryExpanded match={match} />}
    </div>
  );
}

function Metric({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0F0F13] px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.08em] text-[#5A5A65] mb-1">{label}</p>
      <p className="text-[18px] font-bold leading-none" style={{ color: highlight ? "#D4A843" : "#F0F0F2" }}>
        {value}
      </p>
    </div>
  );
}

function WinnerBlock({ match }: { match: MatchListItem }) {
  const username = match.playerUsername ?? "Unknown";
  const rankIcon = getRankIconPath(match.playerRankKey);
  const level = match.playerLevel ?? 1;
  const bodyRender = `https://mc-heads.net/body/${encodeURIComponent(username)}/right`;

  return (
    <Link
      to={`/player/${encodeURIComponent(username)}`}
      className="group/winner w-full max-w-[560px] rounded-2xl border border-[rgba(212,168,67,0.45)] bg-[linear-gradient(135deg,#18130a_0%,#141418_45%,#1a1522_100%)] px-4 py-3.5 hover:bg-[#1C1A20] transition-colors shadow-[0_0_35px_rgba(212,168,67,0.14)]"
    >
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden">
          <img
            src={bodyRender}
            alt={`${username} skin`}
            className="absolute left-5 top-1 h-[104px] w-auto"
            loading="lazy"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[#C39A3A] mb-1">Victory</p>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {rankIcon && (
              <img
                src={rankIcon}
                alt=""
                className="h-6 w-auto object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <span className="text-[22px] sm:text-[24px] font-extrabold leading-none truncate" style={{ color: getNameColor(match.playerRankKey) }}>
              {username}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <img src={getStarIconPath(level)} alt="" className="w-4 h-4 object-contain" />
            <span className="text-[13px] font-semibold" style={{ color: getLevelColor(level) }}>
              Level {level}
            </span>
            <span className="text-[#7A7A86] text-[12px]">• Click profile</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

