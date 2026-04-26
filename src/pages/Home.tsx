import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Crown, ChevronDown, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatNumber, formatWinRate, modeColor, modeLabel } from "@/lib/tiers";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";
import gsap from "gsap";

type LeaderboardEntry = {
  rank: number;
  playerId: string;
  username: string;
  avatarUrl: string | null;
  rankKey: string;
  level: number;
  wins: number;
  losses: number;
  totalKills: number;
  deaths: number;
  matchesPlayed: number;
  winRate: number;
  kda: number;
  killAverage: number;
};

function placementPalette(rank: number) {
  if (rank === 1) {
    return {
      border: "rgba(255, 215, 0, 0.7)",
      glow: "0 0 35px rgba(255, 215, 0, 0.2)",
      badge: "#FFD700",
    };
  }
  if (rank === 2) {
    return {
      border: "rgba(192, 192, 192, 0.65)",
      glow: "0 0 28px rgba(192, 192, 192, 0.2)",
      badge: "#C0C0C0",
    };
  }
  if (rank === 3) {
    return {
      border: "rgba(205, 127, 50, 0.65)",
      glow: "0 0 28px rgba(205, 127, 50, 0.2)",
      badge: "#CD7F32",
    };
  }
  return {
    border: "rgba(255,255,255,0.08)",
    glow: "0 0 0 transparent",
    badge: "#5C6658",
  };
}

function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!introRef.current) return;
    const parts = introRef.current.querySelectorAll(".hero-intro");
    gsap.fromTo(
      parts,
      { opacity: 0, y: 44 },
      {
        opacity: 1,
        y: 0,
        duration: 0.95,
        stagger: 0.11,
        ease: "power3.out",
        delay: 0.12,
      }
    );
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-[88dvh] sm:min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden pt-14"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-mn-void via-mn-canopy/90 to-mn-void" />
      <div className="absolute inset-0 mn-grid-overlay opacity-[0.85]" />
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[min(100vw,560px)] h-[240px] sm:h-[300px] bg-mn-lime/[0.11] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[15%] right-[6%] w-56 h-56 sm:w-72 sm:h-72 bg-mn-teal/[0.09] blur-[88px] rounded-full pointer-events-none" />
      <div
        className="absolute top-1/2 left-4 sm:left-10 -translate-y-1/2 hidden lg:block w-px h-40 bg-gradient-to-b from-transparent via-mn-lime/35 to-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute top-1/2 right-4 sm:right-10 -translate-y-1/2 hidden lg:block w-px h-40 bg-gradient-to-b from-transparent via-mn-teal/30 to-transparent pointer-events-none"
        aria-hidden
      />

      <div ref={introRef} className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <p className="hero-intro mn-eyebrow mb-6 text-mn-fog">
          MonkeyNetwork · live boards
        </p>

        <h1 className="hero-intro font-display font-extrabold tracking-[-0.055em] leading-[0.9] mb-5 sm:mb-7">
          <span className="block text-[44px] sm:text-[clamp(3.5rem,12vw,6.75rem)] text-mn-mist">Monkey</span>
          <span className="block text-[44px] sm:text-[clamp(3.5rem,12vw,6.75rem)] mn-wordmark-gradient drop-shadow-[0_0_40px_rgba(196,255,77,0.12)]">
            Network
          </span>
        </h1>

        <p className="hero-intro text-[15px] sm:text-lg text-mn-fog font-medium max-w-md leading-relaxed mb-8 sm:mb-10">
          Competitive Minecraft UHC rankings — sharp stats, real matches, zero filler.
        </p>

        <div className="hero-intro flex flex-wrap items-center justify-center gap-3">
          {[{ icon: Gamepad2, label: "UHC focus" }].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2.5 rounded-lg border border-mn-lime/20 bg-mn-leaf/50 pl-3 pr-4 py-2 backdrop-blur-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-mn-lime/15 text-mn-lime">
                <stat.icon className="w-3.5 h-3.5" />
              </span>
              <span className="text-[13px] font-semibold tracking-normal text-mn-mist font-mono uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-70">
        <ChevronDown className="w-6 h-6 text-mn-dim" />
      </div>
    </section>
  );
}

function LeaderboardSection() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState("overall");
  const [classScope, setClassScope] = useState<"all" | "kit">("all");
  const [kitKey, setKitKey] = useState<string>("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<
    "username" | "wins" | "winRate" | "kda" | "deaths" | "killAverage" | "totalKills" | "matchesPlayed"
  >("kda");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: filterData } = trpc.leaderboard.filters.useQuery({
    mode: activeMode,
  });
  const modes = ["overall", ...(filterData?.modes ?? [])];
  const kits = filterData?.kits ?? [];

  const { data: leaderboard, isLoading } = trpc.leaderboard.list.useQuery(
    {
      mode: activeMode,
      classScope,
      kitKey: classScope === "kit" ? kitKey : undefined,
      page,
      limit: 50,
      sortBy,
      sortOrder,
    },
    {
      enabled: classScope !== "kit" || Boolean(kitKey),
    },
  );

  const modeTabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
  }, [activeMode, classScope, kitKey]);

  useEffect(() => {
    if (classScope === "kit" && !kitKey && kits.length > 0) {
      setKitKey(kits[0]);
    }
  }, [classScope, kitKey, kits]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "username" ? "asc" : field === "deaths" ? "asc" : "desc");
    }
  };

  return (
    <section className="max-w-[1280px] mx-auto px-3 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 flex gap-4 sm:gap-5">
        <div
          className="w-1 shrink-0 rounded-full bg-gradient-to-b from-mn-lime via-mn-teal/80 to-transparent shadow-[0_0_20px_rgba(196,255,77,0.25)]"
          aria-hidden
        />
        <div className="min-w-0">
          <h2 className="font-display text-[26px] sm:text-[32px] font-bold text-mn-mist mb-2 tracking-[-0.03em]">
            {activeMode === "overall" ? "Global leaderboard" : `${modeLabel(activeMode)} leaderboard`}
          </h2>
          <p className="text-[15px] text-mn-fog leading-relaxed max-w-2xl">
            Ranked by live match performance
            {activeMode !== "overall" ? ` in ${modeLabel(activeMode)}` : " across all game modes"}
            {classScope === "kit" && kitKey ? ` (${modeLabel(kitKey)})` : " (all kits)"}.
          </p>
        </div>
      </div>

      <div
        ref={modeTabsRef}
        className="flex gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveMode(mode)}
            className="px-5 py-3 text-[14px] font-medium rounded-lg transition-all duration-200 shrink-0 whitespace-nowrap"
            style={{
              color: activeMode === mode ? "#E8EDE5" : "#9BA39A",
              backgroundColor: activeMode === mode ? "rgba(196, 255, 77, 0.06)" : "transparent",
              borderBottom: activeMode === mode ? `2px solid ${modeColor(mode)}` : "2px solid transparent",
            }}
          >
            {modeLabel(mode)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
        <button
          onClick={() => setClassScope("all")}
          className="px-3 py-2 rounded-lg text-[13px] border transition-colors max-sm:flex-1 max-sm:min-w-[120px]"
          style={{
            color: classScope === "all" ? "#E8EDE5" : "#9BA39A",
            borderColor: classScope === "all" ? "rgba(196,255,77,0.35)" : "rgba(255,255,255,0.08)",
            backgroundColor: classScope === "all" ? "rgba(196,255,77,0.06)" : "transparent",
          }}
        >
          All Kits
        </button>
        <button
          onClick={() => setClassScope("kit")}
          className="px-3 py-2 rounded-lg text-[13px] border transition-colors max-sm:flex-1 max-sm:min-w-[120px]"
          style={{
            color: classScope === "kit" ? "#E8EDE5" : "#9BA39A",
            borderColor: classScope === "kit" ? "rgba(196,255,77,0.35)" : "rgba(255,255,255,0.08)",
            backgroundColor: classScope === "kit" ? "rgba(196,255,77,0.06)" : "transparent",
          }}
        >
          By Kit
        </button>
        {classScope === "kit" && (
          <select
            value={kitKey}
            onChange={(event) => setKitKey(event.target.value)}
            className="bg-mn-moss border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-mn-mist max-sm:w-full"
          >
            {kits.length === 0 && <option value="">No kits</option>}
            {kits.map((kit: string) => (
              <option key={kit} value={kit}>
                {modeLabel(kit)}
              </option>
            ))}
          </select>
        )}
        <select
          value={sortBy}
          onChange={(event) =>
            toggleSort(event.target.value as typeof sortBy)
          }
          className="ml-auto bg-mn-moss border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-mn-mist max-sm:ml-0 max-sm:w-full sm:max-w-[220px]"
        >
          <option value="totalKills">Sort: Total Kills</option>
          <option value="wins">Sort: Wins</option>
          <option value="winRate">Sort: Win Rate</option>
          <option value="kda">Sort: KDA</option>
          <option value="killAverage">Sort: Kill Avg</option>
          <option value="deaths">Sort: Deaths</option>
          <option value="username">Sort: Username</option>
        </select>
        <button
          onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
          className="bg-mn-moss border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-mn-fog hover:text-mn-mist transition-colors max-sm:w-full sm:w-auto"
        >
          {sortOrder === "desc" ? "Desc" : "Asc"}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-mn-moss border border-white/[0.07] rounded-2xl animate-pulse" />
          ))
        ) : leaderboard?.players.length === 0 ? (
          <div className="bg-mn-moss border border-white/[0.07] rounded-2xl px-4 py-12 text-center text-[14px] text-mn-dim">
            No players found
          </div>
        ) : (
          leaderboard?.players.map((player: LeaderboardEntry, idx: number) => {
            const rank = player.rank || idx + 1 + (page - 1) * 50;
            const isTop3 = rank <= 3;
            const palette = placementPalette(rank);
            return (
              <button
                key={player.playerId}
                onClick={() => navigate(`/player/${encodeURIComponent(player.username)}`)}
                className="group relative w-full overflow-hidden rounded-xl sm:rounded-2xl border bg-mn-moss/95 text-left transition-all duration-200 md:hover:-translate-x-3 md:hover:scale-[1.01] hover:bg-mn-leaf active:scale-[0.99]"
                style={{ borderColor: palette.border, boxShadow: palette.glow }}
              >
                {isTop3 && (
                  <div
                    className={`leaderboard-shimmer pointer-events-none absolute inset-0 ${
                      rank === 1
                        ? "leaderboard-shimmer--gold opacity-55"
                        : rank === 2
                          ? "leaderboard-shimmer--silver opacity-35"
                          : "leaderboard-shimmer--bronze opacity-35"
                    }`}
                  />
                )}
                <div className="relative z-10 flex flex-col gap-3 p-2.5 sm:p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                  <div className="flex items-center gap-3 min-w-0 max-sm:flex-col max-sm:items-start">
                    <div className="group/rank relative h-16 w-28 sm:h-20 sm:w-36 rounded-lg bg-mn-void border border-white/[0.08] overflow-hidden shrink-0">
                      {isTop3 && (
                        <div className="leaderboard-shimmer absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/rank:opacity-75" />
                      )}
                      <span
                        className="absolute left-1.5 sm:left-2 bottom-1 text-[24px] sm:text-[32px] font-black italic leading-none drop-shadow-[0_3px_2px_rgba(0,0,0,0.7)]"
                        style={{ color: palette.badge }}
                      >
                        {rank}.
                      </span>
                      <img
                        src={`https://mc-heads.net/body/${encodeURIComponent(player.username)}/right`}
                        alt={`${player.username} top-half skin`}
                        className="absolute right-4 sm:right-7 top-0 sm:top-1 h-[92px] sm:h-[116px] w-auto drop-shadow-[-4px_-2px_2px_rgba(0,0,0,0.45)]"
                        loading={rank <= 3 ? "eager" : "lazy"}
                      />
                    </div>

                    <div className="min-w-0 w-full">
                      <div className="flex items-start gap-2 max-lg:flex-col">
                        <div className="flex items-center gap-2">
                          {getRankIconPath(player.rankKey) && (
                            <img
                              src={getRankIconPath(player.rankKey)}
                              alt=""
                              className="h-7 w-auto shrink-0 object-contain drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]"
                              style={{ imageRendering: "pixelated" }}
                            />
                          )}
                          {isTop3 && <Crown className="w-4 h-4 shrink-0" style={{ color: palette.badge }} />}
                        </div>
                        <h3
                          className="text-[17px] sm:text-[20px] md:text-[24px] font-bold tracking-normal break-all whitespace-normal leading-tight font-sans"
                          style={{ color: getNameColor(player.rankKey) }}
                        >
                          {player.username}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] text-mn-fog">
                        <img src={getStarIconPath(player.level)} alt="" className="w-4 h-4 object-contain" />
                        <span style={{ color: getLevelColor(player.level) }}>Level {formatNumber(player.level)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:ml-auto grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center md:gap-3">
                    <div className="rounded-lg border border-white/[0.07] bg-mn-canopy px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-mn-dim">Wins</p>
                      <p className="text-[14px] font-bold text-mn-mist">{formatNumber(player.wins)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-mn-canopy px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-mn-dim">Win Rate</p>
                      <p className="text-[14px] font-bold text-mn-mist">{formatWinRate(player.winRate)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-mn-canopy px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-mn-dim">KDA</p>
                      <p className="text-[14px] font-bold text-mn-mist">{(player.kda ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-white/[0.07] bg-mn-canopy px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-mn-dim">Kills</p>
                      <p className="text-[14px] font-bold text-mn-mist">{formatNumber(player.totalKills)}</p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {leaderboard && leaderboard.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-2 bg-mn-moss border border-white/[0.07] rounded-lg text-[13px] text-mn-fog hover:bg-mn-leaf disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          {Array.from({ length: Math.min(5, leaderboard.totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[13px] font-medium transition-colors"
                style={{
                  backgroundColor: page === pageNum ? "#1A2620" : "#121A15",
                  color: page === pageNum ? "#E8EDE5" : "#9BA39A",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(leaderboard.totalPages, page + 1))}
            disabled={page >= leaderboard.totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-mn-moss border border-white/[0.07] rounded-lg text-[13px] text-mn-fog hover:bg-mn-leaf disabled:opacity-40 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <div>
      <HeroSection />
      <LeaderboardSection />
    </div>
  );
}
