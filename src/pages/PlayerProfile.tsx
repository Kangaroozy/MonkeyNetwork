import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  Backpack,
  Calendar,
  ChevronRight,
  CircleDot,
  Coins,
  Crosshair,
  Fish,
  Flame,
  Grid3x3,
  Heart,
  HeartPulse,
  Pickaxe,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Utensils,
  Wind,
  Zap,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatNumber, formatWinRate, modeLabel } from "@/lib/tiers";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";
import MatchHistoryCard from "@/components/match-history/MatchHistoryCard";

function formatDecimal(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

/** Plain-language match count for kit summary lines. */
function formatMatchCount(n: number): string {
  if (n === 1) return "1 match";
  return `${formatNumber(n)} matches`;
}

const MAX_PROGRESS_TIER = 5;

const CLASS_ICONS: Record<string, React.ElementType> = {
  miner: Pickaxe,
  warrior: Swords,
  archer: Target,
  looter: Backpack,
  trapper: Grid3x3,
  fisherman: Fish,
};

const PERK_ICONS: Record<string, React.ElementType> = {
  experience_boost: TrendingUp,
  haste: Zap,
  starter_health: Heart,
  speed: Wind,
  golden_bounty: Coins,
  saturation: Utensils,
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

function progressionCardClass(level: number): string {
  if (level >= MAX_PROGRESS_TIER) {
    return "border-mn-lime/35 bg-[linear-gradient(135deg,rgba(196,255,77,0.1)_0%,rgba(46,196,182,0.06)_100%)] shadow-[0_0_24px_rgba(196,255,77,0.1)]";
  }
  return "border-white/[0.08] bg-mn-void/90";
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

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mn-eyebrow mb-1.5 text-mn-dim">{eyebrow}</p> : null}
        <h2 className="font-display text-xl font-bold tracking-[-0.03em] text-mn-mist sm:text-2xl">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function PerformanceStatRow({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-mn-void/90 px-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mn-moss/80 text-mn-lime ring-1 ring-mn-lime/15">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-[14px] font-medium text-mn-mist">{label}</span>
          <span className="text-lg font-bold tabular-nums tracking-tight text-mn-mist sm:text-xl">{value}</span>
        </div>
        {detail ? <p className="mt-1 text-[12px] leading-snug text-mn-fog">{detail}</p> : null}
      </div>
    </div>
  );
}

type PlayerForClassUsage = {
  mostUsedClass: string;
  classUsage: Array<{ kitKey: string; uses: number; wins: number; losses: number; kills: number }>;
};

function KitUsageStatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-mn-void/70 px-3 py-2.5 text-center sm:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-mn-dim">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-mn-mist sm:text-2xl">{value}</p>
    </div>
  );
}

function ClassUsagePanel({ player }: { player: PlayerForClassUsage }) {
  const top = player.classUsage?.[0];
  const kitKey = (top?.kitKey ?? "").toLowerCase();
  const hasData = Boolean(top) && player.mostUsedClass !== "Unknown";
  const ClassIcon = CLASS_ICONS[kitKey] ?? UserRound;
  const tone = classTone(kitKey || "miner");
  const uses = top?.uses ?? 0;
  const wins = top?.wins ?? 0;
  const losses = top?.losses ?? 0;
  const kills = top?.kills ?? 0;

  if (!hasData) {
    return (
      <div className="rounded-xl border border-dashed border-white/[0.1] bg-mn-void/40 px-4 py-8 text-center">
        <p className="text-[13px] text-mn-fog">No kit usage yet — play a match and stats will show here.</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border bg-mn-void/50 p-1 ${tone.border}`}>
      <div className={`rounded-[10px] bg-gradient-to-br p-4 sm:p-5 ${tone.glow}`}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <span
            className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16 ${tone.chip}`}
          >
            <ClassIcon className="h-7 w-7 sm:h-8 sm:w-8 opacity-95" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="mn-eyebrow mb-1 text-mn-dim">Most-played kit</p>
              <p className="text-[22px] font-bold leading-tight tracking-tight text-mn-mist sm:text-2xl">{player.mostUsedClass}</p>
              <p className="mt-2 text-[14px] font-medium leading-snug text-mn-mist">
                Your strongest pick by match volume — {formatMatchCount(uses)} logged on this kit across every mode we track.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KitUsageStatBox label="Matches" value={formatNumber(uses)} />
              <KitUsageStatBox label="Wins" value={formatNumber(wins)} />
              <KitUsageStatBox label="Losses" value={formatNumber(losses)} />
              <KitUsageStatBox label="Kills" value={formatNumber(kills)} />
            </div>
            <p className="text-[11px] leading-relaxed text-mn-dim">
              These numbers come from real games you finished on MonkeyNetwork. Every time you play this kit in a match, it adds
              to your totals. Wins, losses, kills, and how many matches you used it all update when the game saves at the end.
              The hub and queue can&apos;t change them — only your actual matches can.
            </p>
          </div>
        </div>
      </div>
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
      <div className="mx-auto max-w-[1200px] px-4 pb-16 pt-20 sm:px-6">
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-mn-leaf" />
        <div className="mb-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="mx-auto h-80 w-full max-w-[260px] animate-pulse rounded-2xl bg-mn-leaf lg:mx-0" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-mn-leaf" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-mn-leaf" />
            <div className="h-24 animate-pulse rounded-xl bg-mn-leaf" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="space-y-2 rounded-2xl border border-white/[0.06] bg-mn-moss/40 p-4">
              <div className="mb-3 h-3 w-24 animate-pulse rounded bg-mn-leaf" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[72px] animate-pulse rounded-xl bg-mn-leaf" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1200px] flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
        <p className="text-lg text-mn-fog">Player not found</p>
        <p className="mt-2 max-w-sm text-sm text-mn-dim">That username may be misspelled or not in the database yet.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-mn-lime/30 bg-mn-lime/10 px-4 py-2.5 text-sm font-medium text-mn-lime transition-colors hover:bg-mn-lime/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leaderboards
        </Link>
      </div>
    );
  }

  const rankIcon = getRankIconPath(player.rankKey);
  const accentColor = getNameColor(player.rankKey);
  const expPct = Math.round(player.expProgress * 100);

  const modeTabLabel = (slug: string) => {
    if (slug === "overall") return "Overall";
    return player.modeBreakdown.find((e) => e.modeSlug === slug)?.modeName ?? modeLabel(slug);
  };

  return (
    <div className="pb-20 pt-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-mn-fog transition-colors hover:text-mn-lime"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Leaderboards
        </Link>

        {/* Hero */}
        <header className="relative mb-10 overflow-hidden rounded-2xl border border-white/[0.09] bg-mn-moss/60 shadow-[0_0_0_1px_rgba(196,255,77,0.04)_inset]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-mn-lime/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-mn-teal/10 blur-3xl" />
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full opacity-30 blur-[100px]"
            style={{ backgroundColor: accentColor }}
          />

          <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(200px,280px)_1fr] lg:items-stretch lg:gap-10">
            <div className="flex justify-center lg:justify-start">
              <div className="relative w-full max-w-[260px]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-mn-lime/25 via-transparent to-mn-teal/20 opacity-60 blur-xl" />
                <div className="relative overflow-hidden rounded-2xl border border-mn-lime/20 bg-mn-void ring-1 ring-white/[0.06]">
                  <div className="relative flex aspect-[4/5] w-full items-center justify-center p-4 sm:p-5">
                    <img
                      src={`https://mc-heads.net/body/${encodeURIComponent(player.username)}/right`}
                      alt=""
                      className="block max-h-[min(94%,320px)] w-auto max-w-[min(92%,252px)] object-contain object-center sm:max-h-[min(92%,340px)] sm:max-w-[min(90%,268px)]"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col justify-between gap-6">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {rankIcon ? (
                    <img src={rankIcon} alt="" className="h-8 w-auto object-contain sm:h-9" style={{ imageRendering: "pixelated" }} />
                  ) : null}
                  <span className="rounded-md border border-white/[0.08] bg-mn-void/80 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.06em] text-mn-dim">
                    Profile
                  </span>
                </div>
                <h1 className="break-all text-3xl font-bold leading-tight tracking-normal text-mn-mist sm:text-4xl lg:text-[2.75rem]" style={{ color: accentColor }}>
                  {player.username}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-mn-fog">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-mn-dim" />
                    Joined {new Date(player.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                  <span className="hidden text-mn-dim sm:inline">·</span>
                  <span>{formatNumber(player.matchesPlayed)} matches</span>
                  <span className="hidden text-mn-dim sm:inline">·</span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-mn-void/60 px-2 py-1">
                    <img src={getStarIconPath(player.level)} alt="" className="h-3.5 w-3.5 object-contain" />
                    <span className="font-medium" style={{ color: getLevelColor(player.level) }}>
                      Level {player.level}
                    </span>
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.08] bg-mn-void/70 p-4 sm:p-5">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mn-dim">Battle royale XP</p>
                  <p className="text-sm font-semibold tabular-nums text-mn-mist">
                    {formatNumber(player.expCurrent)}
                    <span className="text-mn-fog"> / {formatNumber(player.expRequired)}</span>
                  </p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-mn-moss">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2EC4B6,#C4FF4D)] transition-[width] duration-500"
                    style={{ width: `${expPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[12px] text-mn-dim">{expPct}% to next level</p>
              </div>
            </div>
          </div>
        </header>

        {/* Performance */}
        <section className="mb-12">
          <SectionHeading eyebrow="Combat & results" title="Performance" />
          <p className="-mt-2 mb-5 max-w-3xl text-[11px] leading-relaxed text-mn-dim">
            The big stats here come from UHC matches you&apos;ve actually finished. Your class levels, perks, and the XP bar up
            top come from your hub account. Match numbers update when a game ends; XP and perks update when you play in the hub.
            Queueing or hanging out in the lobby won&apos;t change your match results.
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-mn-moss/80 p-5 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
              <div>
                <p className="mn-eyebrow mb-3 text-mn-dim">Record</p>
                <ul className="space-y-2">
                  <li>
                    <PerformanceStatRow
                      icon={Target}
                      label="Win rate"
                      value={formatWinRate(player.winRate)}
                      detail={`${formatNumber(player.totalWins)} wins · ${formatNumber(player.totalLosses)} losses`}
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Flame}
                      label="KDA"
                      value={formatDecimal(player.kda)}
                      detail={`${formatNumber(player.totalKills)} kills across all matches`}
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Crosshair}
                      label="Total kills"
                      value={formatNumber(player.totalKills)}
                      detail={`Peak in one match: ${formatNumber(player.maxKillsInMatch)}`}
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Trophy}
                      label="Matches played"
                      value={formatNumber(player.matchesPlayed)}
                      detail="All-time on MonkeyNetwork"
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Sparkles}
                      label="Legendaries crafted"
                      value={formatNumber(player.totalLegendariesCrafted)}
                      detail="Special items you finished at a crafting table in real matches — one count each time you complete a legendary recipe."
                    />
                  </li>
                </ul>
              </div>
              <div>
                <p className="mn-eyebrow mb-3 text-mn-dim">Combat volume</p>
                <ul className="space-y-2">
                  <li>
                    <PerformanceStatRow
                      icon={Sword}
                      label="Damage dealt"
                      value={formatNumber(player.totalDamageDealt)}
                      detail={`Best match ${formatNumber(player.maxDamageInMatch)} · ${formatDecimal(player.avgDamagePerMatch)} avg / game`}
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={HeartPulse}
                      label="Damage taken"
                      value={formatNumber(player.totalDamageTaken)}
                      detail={`Healing used: ${formatNumber(player.totalHealingUsed)}`}
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Zap}
                      label="Peak kills"
                      value={formatNumber(player.maxKillsInMatch)}
                      detail="Most kills in a single match"
                    />
                  </li>
                  <li>
                    <PerformanceStatRow
                      icon={Skull}
                      label="Deaths"
                      value={formatNumber(player.totalDeaths)}
                      detail={
                        player.lastSeenAt
                          ? `Last seen ${new Date(player.lastSeenAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : undefined
                      }
                    />
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 border-t border-white/[0.07] pt-6">
              <ClassUsagePanel player={player} />
            </div>
          </div>
        </section>

        {/* Progression + modes */}
        <div className="mb-12 grid gap-8 lg:grid-cols-2">
          <section>
            <SectionHeading eyebrow="Loadout" title="Class upgrades" />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {player.classUpgradeLevels.map((entry) => {
                const ClassIcon = CLASS_ICONS[entry.key] ?? CircleDot;
                return (
                  <div
                    key={entry.key}
                    className={`rounded-xl border p-3 ${progressionCardClass(entry.level)} ${classTone(entry.key).border}`}
                  >
                    <div className={`rounded-lg bg-gradient-to-br ${classTone(entry.key).glow} p-3`}>
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${classTone(entry.key).chip}`}
                        >
                          <ClassIcon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={2.25} aria-hidden />
                          {entry.name}
                        </span>
                        <span className="text-[12px] font-bold tabular-nums text-mn-mist">Lv.{entry.level}</span>
                      </div>
                    </div>
                    {entry.level >= MAX_PROGRESS_TIER ? (
                      <p className="mt-2 text-center text-[11px] font-semibold text-mn-lime">Maxed</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeading eyebrow="Bonuses" title="Perks" />
            {player.perkLevels.length > 0 ? (
              <ul className="space-y-2">
                {player.perkLevels.map((entry) => {
                  const PerkIcon = PERK_ICONS[entry.key] ?? CircleDot;
                  return (
                    <li
                      key={entry.key}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${progressionCardClass(entry.level)}`}
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mn-void/90 text-mn-fog ring-1 ring-white/[0.08]">
                        <PerkIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-mn-mist">
                          {entry.name}
                          <span className="ml-2 tabular-nums text-mn-fog">Tier {entry.level}</span>
                          {entry.level >= MAX_PROGRESS_TIER ? (
                            <span className="ml-2 text-[12px] font-semibold text-mn-lime">MAX</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-snug text-mn-fog">{entry.summary}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-white/[0.1] bg-mn-moss/40 px-4 py-8 text-center text-sm text-mn-dim">No perk data yet.</p>
            )}
          </section>
        </div>

        {/* Mode breakdown — full width */}
        <section className="mb-12">
          <SectionHeading eyebrow="Queues" title="Mode breakdown" />
          <div className="rounded-2xl border border-white/[0.08] bg-mn-moss/80 p-5 sm:p-6">
            <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              {modeOptions.map((mode: string) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setActiveMode(mode)}
                  className={`shrink-0 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    activeMode === mode
                      ? "border-mn-lime/40 bg-mn-lime/12 text-mn-lime"
                      : "border-transparent bg-mn-void/50 text-mn-fog hover:bg-mn-void hover:text-mn-mist"
                  }`}
                >
                  {modeTabLabel(mode)}
                </button>
              ))}
            </div>

            {activeMode === "overall" ? (
              <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.06] bg-mn-void/50">
                {player.modeBreakdown.length === 0 ? (
                  <li className="px-4 py-8 text-center text-sm text-mn-dim">No per-mode stats yet.</li>
                ) : (
                  player.modeBreakdown.map(
                    (mode: { modeSlug: string; modeName: string; matchesPlayed: number; winRate: number }) => (
                      <li key={mode.modeSlug} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                        <span className="font-medium text-mn-mist">{mode.modeName}</span>
                        <span className="text-[13px] tabular-nums text-mn-fog">
                          {formatNumber(mode.matchesPlayed)} matches
                          <span className="mx-2 text-mn-dim">·</span>
                          {formatWinRate(mode.winRate)}
                        </span>
                      </li>
                    ),
                  )
                )}
              </ul>
            ) : currentModeStats ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <StatRow label="Matches" value={formatNumber(currentModeStats.matchesPlayed)} />
                <StatRow label="Win rate" value={formatWinRate(currentModeStats.winRate)} />
                <StatRow label="Wins" value={formatNumber(currentModeStats.wins)} />
                <StatRow label="Losses" value={formatNumber(currentModeStats.losses)} />
                <StatRow label="Kills" value={formatNumber(currentModeStats.kills)} />
                <StatRow label="Deaths" value={formatNumber(currentModeStats.deaths)} />
                <StatRow label="Damage dealt" value={formatNumber(currentModeStats.damageDealt)} highlight />
              </div>
            ) : (
              <p className="text-sm text-mn-dim">No data for this mode yet.</p>
            )}
          </div>
        </section>

        {/* Match history */}
        <section>
          <SectionHeading
            eyebrow="Recent activity"
            title="Match history"
            action={
              <Link
                to={`/matches?player=${encodeURIComponent(player.username)}${selectedMode ? `&mode=${encodeURIComponent(selectedMode)}` : ""}`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-mn-lime hover:underline"
              >
                Full history
                <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
          <p className="-mt-2 mb-4 text-[13px] text-mn-fog">
            Showing last 8 matches
            {selectedMode ? ` · filtered to ${modeTabLabel(activeMode)}` : " · all modes"}.
          </p>
          <div className="space-y-3">
            {matchHistoryData && matchHistoryData.items.length > 0 ? (
              matchHistoryData.items.map((match) => (
                <MatchHistoryCard key={match.id} match={match} showPrimaryPlayer={false} compact view="player" />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.1] bg-mn-moss/40 px-4 py-12 text-center text-sm text-mn-dim">
                No match history for this filter.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        highlight ? "border-mn-lime/25 bg-mn-lime/[0.06]" : "border-white/[0.07] bg-mn-void/60"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-mn-dim">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-mn-mist">{value}</p>
    </div>
  );
}
