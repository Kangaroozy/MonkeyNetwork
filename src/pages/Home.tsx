import { useState, useEffect, useRef } from "react";
import { Crown, ChevronDown, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { formatNumber, formatWinRate, modeColor, modeLabel } from "@/lib/tiers";
import { openPlayerModal } from "@/lib/playerModal";
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
    badge: "#5A5A65",
  };
}

function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;
    const letters = titleRef.current.querySelectorAll(".hero-letter");
    gsap.fromTo(
      letters,
      { opacity: 0, y: 60, rotateX: -90 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 1.2,
        stagger: 0.08,
        ease: "back.out(1.2)",
        delay: 0.3,
      }
    );
  }, []);

  const title = "MonkeyNetwork";

  return (
    <section
      ref={heroRef}
      className="relative min-h-[88dvh] sm:min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B] via-[#0d0d10] to-[#0A0A0B]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A843] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#9B59B6] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 text-center px-4">
        <h1
          ref={titleRef}
          className="text-[46px] sm:text-[96px] lg:text-[128px] font-extrabold tracking-[-0.02em] leading-none mb-4 sm:mb-6"
          style={{ perspective: "1000px" }}
        >
          {title.split("").map((letter, i) => (
            <span
              key={i}
              className="hero-letter inline-block"
              style={{
                color: i === 0 ? "#D4A843" : "#F0F0F2",
                textShadow: "0 0 60px rgba(212, 168, 67, 0.15)",
              }}
            >
              {letter}
            </span>
          ))}
        </h1>

        <p className="text-[15px] sm:text-[20px] text-[#8A8A95] font-normal mb-7 sm:mb-8">
          Competitive Minecraft UHC Rankings
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: Gamepad2, label: "UHC" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-2 bg-[#1A1A1F] border border-[rgba(255,255,255,0.06)] rounded-full px-4 py-2"
            >
              <stat.icon className="w-3.5 h-3.5 text-[#8A8A95]" />
              <span className="text-[13px] font-medium text-[#8A8A95]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="w-6 h-6 text-[#5A5A65]" />
      </div>
    </section>
  );
}

function LeaderboardSection() {
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
    <section className="max-w-[1280px] mx-auto px-3 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <h2 className="text-[28px] font-bold text-[#F0F0F2] mb-2">
          {activeMode === "overall" ? "Global Leaderboard" : `${modeLabel(activeMode)} Leaderboard`}
        </h2>
        <p className="text-[15px] text-[#8A8A95]">
          Ranked by live match performance
          {activeMode !== "overall" ? ` in ${modeLabel(activeMode)}` : " across all game modes"}
          {classScope === "kit" && kitKey ? ` (${modeLabel(kitKey)})` : " (all kits)"}.
        </p>
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
              color: activeMode === mode ? "#F0F0F2" : "#8A8A95",
              backgroundColor: activeMode === mode ? "rgba(255,255,255,0.06)" : "transparent",
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
            color: classScope === "all" ? "#F0F0F2" : "#8A8A95",
            borderColor: classScope === "all" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
            backgroundColor: classScope === "all" ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          All Kits
        </button>
        <button
          onClick={() => setClassScope("kit")}
          className="px-3 py-2 rounded-lg text-[13px] border transition-colors max-sm:flex-1 max-sm:min-w-[120px]"
          style={{
            color: classScope === "kit" ? "#F0F0F2" : "#8A8A95",
            borderColor: classScope === "kit" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
            backgroundColor: classScope === "kit" ? "rgba(255,255,255,0.05)" : "transparent",
          }}
        >
          By Kit
        </button>
        {classScope === "kit" && (
          <select
            value={kitKey}
            onChange={(event) => setKitKey(event.target.value)}
            className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-[13px] text-[#F0F0F2] max-sm:w-full"
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
          className="ml-auto bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-[13px] text-[#F0F0F2] max-sm:ml-0 max-sm:w-full sm:max-w-[220px]"
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
          className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-[13px] text-[#8A8A95] hover:text-[#F0F0F2] transition-colors max-sm:w-full sm:w-auto"
        >
          {sortOrder === "desc" ? "Desc" : "Asc"}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-2xl animate-pulse" />
          ))
        ) : leaderboard?.players.length === 0 ? (
          <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-12 text-center text-[14px] text-[#5A5A65]">
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
                onClick={() => openPlayerModal(player.username)}
                className="group relative w-full overflow-hidden rounded-xl sm:rounded-2xl border bg-[#111114]/90 text-left transition-all duration-200 md:hover:-translate-x-3 md:hover:scale-[1.01] hover:bg-[#18181d] active:scale-[0.99]"
                style={{ borderColor: palette.border, boxShadow: palette.glow }}
              >
                {isTop3 && (
                  <div className="leaderboard-shimmer pointer-events-none absolute inset-0 opacity-35" />
                )}
                <div className="relative z-10 flex flex-col gap-3 p-2.5 sm:p-3 md:flex-row md:items-center md:gap-4 md:p-4">
                  <div className="flex items-center gap-3 min-w-0 max-sm:flex-col max-sm:items-start">
                    <div className="group/rank relative h-16 w-28 sm:h-20 sm:w-36 rounded-lg bg-[#0c0c10] border border-[rgba(255,255,255,0.08)] overflow-hidden shrink-0">
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
                          className="text-[17px] sm:text-[20px] md:text-[24px] font-extrabold break-all whitespace-normal leading-tight"
                          style={{ color: getNameColor(player.rankKey) }}
                        >
                          {player.username}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[13px] text-[#8A8A95]">
                        <img src={getStarIconPath(player.level)} alt="" className="w-4 h-4 object-contain" />
                        <span style={{ color: getLevelColor(player.level) }}>Level {formatNumber(player.level)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="md:ml-auto grid grid-cols-2 gap-2 w-full md:w-auto md:flex md:items-center md:gap-3">
                    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#16161c] px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5A5A65]">Wins</p>
                      <p className="text-[14px] font-bold text-[#F0F0F2]">{formatNumber(player.wins)}</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#16161c] px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5A5A65]">Win Rate</p>
                      <p className="text-[14px] font-bold text-[#F0F0F2]">{formatWinRate(player.winRate)}</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#16161c] px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5A5A65]">KDA</p>
                      <p className="text-[14px] font-bold text-[#F0F0F2]">{(player.kda ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#16161c] px-2.5 sm:px-3 py-2 md:min-w-[88px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5A5A65]">Kills</p>
                      <p className="text-[14px] font-bold text-[#F0F0F2]">{formatNumber(player.totalKills)}</p>
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
            className="flex items-center gap-1 px-3 py-2 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg text-[13px] text-[#8A8A95] hover:bg-[#1A1A1F] disabled:opacity-40 transition-colors"
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
                  backgroundColor: page === pageNum ? "#1A1A1F" : "#111114",
                  color: page === pageNum ? "#F0F0F2" : "#8A8A95",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(leaderboard.totalPages, page + 1))}
            disabled={page >= leaderboard.totalPages}
            className="flex items-center gap-1 px-3 py-2 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-lg text-[13px] text-[#8A8A95] hover:bg-[#1A1A1F] disabled:opacity-40 transition-colors"
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
