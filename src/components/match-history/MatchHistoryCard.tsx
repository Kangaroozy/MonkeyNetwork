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

type MatchTone = {
  border: string;
  glow: string;
  orb: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  label: string;
};

function getVisualTone(match: MatchListItem, view: "global" | "player"): MatchTone {
  if (view === "global") {
    if ((match.kills ?? 0) >= 7) {
      return {
        border: "rgba(72, 245, 225, 0.85)",
        glow: "0 0 36px rgba(64, 235, 215, 0.42)",
        orb: "rgba(64, 220, 200, 0.45)",
        badgeBg: "rgba(52, 210, 190, 0.35)",
        badgeText: "#E8FFFC",
        badgeBorder: "rgba(130, 250, 235, 0.65)",
        label: "High Kill Winner",
      };
    }
    return {
      border: "rgba(200, 255, 95, 0.88)",
      glow: "0 0 40px rgba(196, 255, 77, 0.45)",
      orb: "rgba(196, 255, 77, 0.4)",
      badgeBg: "rgba(196, 255, 77, 0.32)",
      badgeText: "#F5FFCC",
      badgeBorder: "rgba(220, 255, 130, 0.7)",
      label: "Match Winner",
    };
  }
  if (match.result === "WIN") {
    return {
      border: "rgba(200, 255, 95, 0.88)",
      glow: "0 0 40px rgba(196, 255, 77, 0.45)",
      orb: "rgba(196, 255, 77, 0.4)",
      badgeBg: "rgba(196, 255, 77, 0.32)",
      badgeText: "#F5FFCC",
      badgeBorder: "rgba(220, 255, 130, 0.7)",
      label: "#1 Victory",
    };
  }
  if ((match.kills ?? 0) >= 7) {
    return {
      border: "rgba(72, 245, 225, 0.85)",
      glow: "0 0 36px rgba(64, 235, 215, 0.42)",
      orb: "rgba(64, 220, 200, 0.45)",
      badgeBg: "rgba(52, 210, 190, 0.35)",
      badgeText: "#E8FFFC",
      badgeBorder: "rgba(130, 250, 235, 0.65)",
      label: "High Kill Run",
    };
  }
  return {
    border: "rgba(255, 118, 132, 0.88)",
    glow: "0 0 36px rgba(255, 95, 115, 0.38)",
    orb: "rgba(255, 100, 118, 0.42)",
    badgeBg: "rgba(255, 95, 110, 0.34)",
    badgeText: "#FFEBEE",
    badgeBorder: "rgba(255, 170, 180, 0.72)",
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
      className="relative overflow-hidden bg-mn-moss border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:bg-mn-leaf"
      style={{ borderColor: tone.border, boxShadow: tone.glow }}
    >
      <div className="absolute -top-10 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: tone.orb }} />

      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className="text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full font-semibold border shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
              style={{
                backgroundColor: tone.badgeBg,
                color: tone.badgeText,
                borderColor: tone.badgeBorder,
              }}
            >
              {tone.label}
            </span>
            <span className="text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-full bg-[rgba(255,255,255,0.08)] text-[#CFCFD6]">
              {match.modeName}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.12em] text-mn-dim shrink-0">Match {shortMatchId}</span>
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
                      <Link to={`/player/${encodeURIComponent(match.playerUsername)}`} className="text-mn-lime hover:underline font-medium">
                        {match.playerUsername}
                      </Link>
                    </>
                  )}
                  {match.result !== "WIN" && killedByName.length > 0 ? (
                    <>
                      <span className="text-[#6E6E79]">{showPrimaryPlayer && match.playerUsername ? "• Killed By:" : "Killed By:"}</span>
                      <Link to={`/player/${encodeURIComponent(killedByName)}`} className="text-mn-mist hover:underline font-medium">
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
                className="px-3 py-2 text-[12px] rounded-lg border border-white/12 text-mn-fog hover:text-mn-mist hover:bg-mn-leaf transition-colors"
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
    <div className="rounded-xl border border-white/[0.07] bg-mn-void px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.08em] text-mn-dim mb-1">{label}</p>
      <p className="text-[18px] font-bold leading-none" style={{ color: highlight ? "#C4FF4D" : "#E8EDE5" }}>
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
      className="group/winner w-full max-w-[560px] rounded-2xl border border-[rgba(200,255,95,0.55)] bg-[linear-gradient(135deg,#0f160f_0%,#0a0f0c_45%,#0c1412_100%)] px-4 py-3.5 hover:bg-mn-leaf/40 transition-colors shadow-[0_0_40px_rgba(196,255,77,0.28)]"
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
          <p className="text-[10px] uppercase tracking-[0.1em] font-semibold mb-1 text-[#E8FF9A] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
            Victory
          </p>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {rankIcon && (
              <img
                src={rankIcon}
                alt=""
                className="h-6 w-auto object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            )}
            <span className="text-[22px] sm:text-[24px] font-bold tracking-normal leading-none truncate font-sans" style={{ color: getNameColor(match.playerRankKey) }}>
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

