import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Calendar, Flame, HeartPulse, Shield, Sword, Target, Trophy, UserRound, Zap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatNumber, formatWinRate } from "@/lib/tiers";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";
import MatchHistoryCard from "@/components/match-history/MatchHistoryCard";

function formatDecimal(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const MAX_PROGRESS_TIER = 5;

const CLASS_EMOJI: Record<string, string> = {
  miner: "⛏️",
  warrior: "⚔️",
  archer: "🏹",
  looter: "🎒",
  trapper: "🪤",
  fisherman: "🎣",
};

const CLASS_TONE: Record<string, { glow: string; border: string; chip: string }> = {
  miner: {
    glow: "from-[rgba(127,172,255,0.18)] to-[rgba(56,89,160,0.14)]",
    border: "border-[rgba(127,172,255,0.34)]",
    chip: "bg-[rgba(127,172,255,0.16)] text-[#CFE0FF]",
  },
  warrior: {
    glow: "from-[rgba(255,131,131,0.18)] to-[rgba(150,59,59,0.14)]",
    border: "border-[rgba(255,131,131,0.34)]",
    chip: "bg-[rgba(255,131,131,0.16)] text-[#FFD2D2]",
  },
  archer: {
    glow: "from-[rgba(174,137,255,0.18)] to-[rgba(92,61,148,0.14)]",
    border: "border-[rgba(174,137,255,0.34)]",
    chip: "bg-[rgba(174,137,255,0.16)] text-[#E6D6FF]",
  },
  looter: {
    glow: "from-[rgba(255,197,109,0.18)] to-[rgba(165,108,36,0.14)]",
    border: "border-[rgba(255,197,109,0.34)]",
    chip: "bg-[rgba(255,197,109,0.16)] text-[#FFE4BA]",
  },
  trapper: {
    glow: "from-[rgba(116,234,196,0.18)] to-[rgba(48,131,105,0.14)]",
    border: "border-[rgba(116,234,196,0.34)]",
    chip: "bg-[rgba(116,234,196,0.16)] text-[#CEFFF0]",
  },
  fisherman: {
    glow: "from-[rgba(115,211,255,0.18)] to-[rgba(39,108,140,0.14)]",
    border: "border-[rgba(115,211,255,0.34)]",
    chip: "bg-[rgba(115,211,255,0.16)] text-[#D4F2FF]",
  },
};

const PERK_EMOJI: Record<string, string> = {
  experience_boost: "✨",
  haste: "⚡",
  starter_health: "❤️",
  speed: "💨",
  golden_bounty: "🪙",
  saturation: "🍖",
}

function progressionCardClass(level: number): string {
  if (level >= MAX_PROGRESS_TIER) {
    return "border-[rgba(255,211,94,0.45)] bg-[linear-gradient(135deg,rgba(214,164,55,0.18)_0%,rgba(168,108,39,0.16)_100%)] shadow-[0_0_26px_rgba(214,164,55,0.22)]";
  }
  return "border-[rgba(255,255,255,0.06)] bg-[#0F0F13]";
}

function classTone(key: string): { glow: string; border: string; chip: string } {
  return (
    CLASS_TONE[key] ?? {
      glow: "from-[rgba(255,255,255,0.14)] to-[rgba(110,110,130,0.12)]",
      border: "border-[rgba(255,255,255,0.2)]",
      chip: "bg-[rgba(255,255,255,0.12)] text-[#ECECF4]",
    }
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = "#F0F0F2",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color }} />
        <span className="text-[11px] uppercase tracking-[0.06em] text-[#717180]">{label}</span>
      </div>
      <p className="text-[27px] font-bold leading-none" style={{ color }}>
        {value}
      </p>
      {subValue ? <p className="mt-1 text-[12px] text-[#8E8E9B]">{subValue}</p> : null}
    </div>
  );
}

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const [activeMode, setActiveMode] = useState<string>("overall");

  const { data: player, isLoading } = trpc.player.getByUsername.useQuery(
    { username: username || "" },
    { enabled: !!username },
  );

  const modeOptions = useMemo<string[]>(
    () => ["overall", ...((player?.modeBreakdown ?? []).map((mode: { modeSlug: string }) => mode.modeSlug))],
    [player?.modeBreakdown],
  );
  const selectedMode = activeMode === "overall" ? undefined : activeMode;
  const currentModeStats = player?.modeBreakdown?.find((mode: { modeSlug: string }) => mode.modeSlug === activeMode);

  const { data: matchHistoryData } = trpc.match.history.useQuery(
    {
      playerUsername: player?.username,
      mode: selectedMode,
      limit: 8,
      dateWindow: "all",
      winsOnly: false,
    },
    { enabled: !!player?.username },
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 pt-24 sm:px-6">
        <div className="animate-pulse">
          <div className="mb-6 h-36 rounded-xl bg-[#222228]" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-24 rounded-xl bg-[#222228]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-24 pt-24 text-center sm:px-6">
        <p className="text-[18px] text-[#8A8A95]">Player not found</p>
        <Link to="/" className="mt-4 inline-block text-[14px] text-[#D4A843] hover:underline">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const rankIcon = getRankIconPath(player.rankKey);
  const accentColor = getNameColor(player.rankKey);

  return (
    <div className="pt-16">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#111114] via-[#0d0d10] to-[#0A0A0B]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-1/3 top-1/3 h-64 w-64 rounded-full blur-[120px]" style={{ backgroundColor: accentColor }} />
        </div>
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-8 pt-10 sm:px-6">
          <Link to="/" className="mb-6 inline-flex items-center gap-2 text-[13px] text-[#8A8A95] hover:text-[#F0F0F2]">
            <ArrowLeft className="h-4 w-4" />
            Back to Leaderboard
          </Link>
          <div className="flex flex-wrap items-start gap-5">
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.18)] bg-[#0E0E13]">
              <img
                src={`https://mc-heads.net/body/${encodeURIComponent(player.username)}/right`}
                alt={`${player.username} model`}
                className="absolute left-1/2 top-1 h-[120px] w-auto -translate-x-1/2"
                loading="lazy"
              />
            </div>
            <div className="min-w-[260px] flex-1">
              <div className="mb-2 flex items-center gap-2">
                {rankIcon ? <img src={rankIcon} alt="" className="h-6 w-auto object-contain" style={{ imageRendering: "pixelated" }} /> : null}
                <h1 className="text-[36px] font-extrabold leading-none" style={{ color: accentColor }}>
                  {player.username}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[14px] text-[#9A9AA8]">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Joined {new Date(player.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <span className="text-[#666671]">•</span>
                <span>{formatNumber(player.matchesPlayed)} Matches</span>
                <span className="text-[#666671]">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(255,255,255,0.05)] px-2 py-0.5">
                  <img src={getStarIconPath(player.level)} alt="" className="h-4 w-4 object-contain" />
                  <span style={{ color: getLevelColor(player.level) }}>Level {player.level}</span>
                </span>
              </div>
            </div>
            <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0F0F13] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.06em] text-[#7D7D8A]">Battle Royale EXP</p>
              <p className="mt-1 text-[16px] font-semibold text-[#F0F0F2]">
                {formatNumber(player.expCurrent)} / {formatNumber(player.expRequired)} XP
              </p>
              <div className="mt-2 h-2 w-40 rounded bg-[rgba(255,255,255,0.08)]">
                <div
                  className="h-full rounded bg-[linear-gradient(90deg,#6EA8FF,#D6A437)]"
                  style={{ width: `${Math.round(player.expProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={UserRound} label="Most Used Class" value={player.mostUsedClass} subValue={`${player.classUsage?.[0]?.uses ?? 0} matches`} color="#D6A437" />
          <StatCard icon={Target} label="Win Rate" value={formatWinRate(player.winRate)} subValue={`${formatNumber(player.totalWins)}W / ${formatNumber(player.totalLosses)}L`} color="#2ECC71" />
          <StatCard icon={Sword} label="Total Damage Dealt" value={formatNumber(player.totalDamageDealt)} subValue={`Peak game: ${formatNumber(player.maxDamageInMatch)}`} color="#FF7A7A" />
          <StatCard icon={HeartPulse} label="Total Damage Taken" value={formatNumber(player.totalDamageTaken)} subValue={`Healing used: ${formatNumber(player.totalHealingUsed)}`} color="#7AA8FF" />
          <StatCard icon={Flame} label="KDA" value={formatDecimal(player.kda)} subValue={`${formatNumber(player.totalKills)} kills`} color="#FFB347" />
          <StatCard icon={Zap} label="Most Kills In A Game" value={formatNumber(player.maxKillsInMatch)} subValue={`Avg dmg/match: ${formatDecimal(player.avgDamagePerMatch)}`} color="#C88CFF" />
          <StatCard icon={Shield} label="Total Deaths" value={formatNumber(player.totalDeaths)} subValue={`Last seen: ${player.lastSeenAt ? new Date(player.lastSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}`} color="#A6A6B7" />
          <StatCard icon={Trophy} label="Matches Played" value={formatNumber(player.matchesPlayed)} subValue="All-time UHC profile" color="#F0F0F2" />
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] p-5">
            <h2 className="mb-3 text-[18px] font-bold text-[#F0F0F2]">Class Upgrade Levels</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {player.classUpgradeLevels.map((entry) => (
                <div key={entry.key} className={`rounded-xl border p-3 transition-all ${progressionCardClass(entry.level)} ${classTone(entry.key).border}`}>
                  <div className={`rounded-lg bg-gradient-to-br ${classTone(entry.key).glow} p-2.5`}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${classTone(entry.key).chip}`}>
                        <span>{CLASS_EMOJI[entry.key] ?? "🎮"}</span>
                        <span>{entry.name}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-[#CDD0E1]">Lvl {entry.level}</span>
                    </div>
                  </div>
                  {entry.level >= MAX_PROGRESS_TIER ? (
                    <p className="mt-2 text-[11px] font-semibold text-[#FFE28A]">MAXED CLASS ✨</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] p-5">
            <h2 className="mb-3 text-[18px] font-bold text-[#F0F0F2]">Perk Levels</h2>
            {player.perkLevels.length > 0 ? (
              <div className="space-y-2.5">
                {player.perkLevels.map((entry) => (
                  <div
                    key={entry.key}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 transition-all ${progressionCardClass(entry.level)}`}
                  >
                    <div>
                      <p className="text-[14px] font-medium text-[#E6E6EF]">
                        <span className="mr-1.5">{PERK_EMOJI[entry.key] ?? "✨"}</span>
                        {entry.name} {entry.level}
                        {entry.level >= MAX_PROGRESS_TIER ? <span className="ml-2 text-[#FFE28A]">MAX ✨</span> : null}
                      </p>
                      <p className="text-[12px] text-[#9A9AA8]">{entry.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-[#8A8A95]">No perk data yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] p-5">
            <h2 className="mb-3 text-[18px] font-bold text-[#F0F0F2]">Mode Breakdown</h2>
            <div className="mb-4 flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {modeOptions.map((mode: string) => (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  className={`shrink-0 rounded-lg px-3 py-2 text-[12px] transition-colors ${
                    activeMode === mode
                      ? "bg-[rgba(214,164,55,0.18)] text-[#F5DDA0]"
                      : "bg-transparent text-[#8A8A95] hover:bg-[rgba(255,255,255,0.06)]"
                  }`}
                >
                  {mode === "overall" ? "Overall" : player.modeBreakdown.find((entry) => entry.modeSlug === mode)?.modeName ?? mode}
                </button>
              ))}
            </div>
            {activeMode === "overall" ? (
              <div className="space-y-2.5">
                {player.modeBreakdown.map((mode: { modeSlug: string; modeName: string; matchesPlayed: number; winRate: number }) => (
                  <div key={mode.modeSlug} className="flex items-center justify-between rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0F0F13] px-3 py-2">
                    <span className="text-[14px] text-[#E6E6EF]">{mode.modeName}</span>
                    <span className="text-[12px] text-[#9A9AA8]">
                      {formatNumber(mode.matchesPlayed)} matches • {formatWinRate(mode.winRate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : currentModeStats ? (
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <StatRow label="Matches" value={formatNumber(currentModeStats.matchesPlayed)} />
                <StatRow label="Win Rate" value={formatWinRate(currentModeStats.winRate)} />
                <StatRow label="Wins" value={formatNumber(currentModeStats.wins)} />
                <StatRow label="Losses" value={formatNumber(currentModeStats.losses)} />
                <StatRow label="Kills" value={formatNumber(currentModeStats.kills)} />
                <StatRow label="Deaths" value={formatNumber(currentModeStats.deaths)} />
                <StatRow label="Damage Dealt" value={formatNumber(currentModeStats.damageDealt)} />
              </div>
            ) : (
              <p className="text-[14px] text-[#8A8A95]">No data for this mode yet.</p>
            )}
          </div>
        </div>

        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[20px] font-bold text-[#F0F0F2]">Match History</h2>
            <Link
              to={`/matches?player=${encodeURIComponent(player.username)}${selectedMode ? `&mode=${encodeURIComponent(selectedMode)}` : ""}`}
              className="text-[13px] text-[#D4A843] hover:underline"
            >
              View full history
            </Link>
          </div>
          <div className="space-y-3">
            {matchHistoryData && matchHistoryData.items.length > 0 ? (
              matchHistoryData.items.map((match) => (
                <MatchHistoryCard key={match.id} match={match} showPrimaryPlayer={false} compact view="player" />
              ))
            ) : (
              <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114] px-4 py-8 text-center text-[14px] text-[#5A5A65]">
                No match history available.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#0F0F13] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.05em] text-[#72727F]">{label}</p>
      <p className="mt-0.5 text-[16px] font-semibold text-[#ECECF4]">{value}</p>
    </div>
  );
}
