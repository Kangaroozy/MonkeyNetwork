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
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0B] via-[#0d0d10] to-[#0A0A0B]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A843] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#9B59B6] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 text-center px-4">
        <h1
          ref={titleRef}
          className="text-[64px] sm:text-[96px] lg:text-[128px] font-extrabold tracking-[-0.02em] leading-none mb-6"
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

        <p className="text-[18px] sm:text-[20px] text-[#8A8A95] font-normal mb-8">
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
  >("totalKills");
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
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
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

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setClassScope("all")}
          className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
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
          className="px-3 py-2 rounded-lg text-[13px] border transition-colors"
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
            className="bg-[#111114] border border-[rgba(255,255,255,0.08)] rounded-lg px-3 py-2 text-[13px] text-[#F0F0F2]"
          >
            {kits.length === 0 && <option value="">No kits</option>}
            {kits.map((kit: string) => (
              <option key={kit} value={kit}>
                {modeLabel(kit)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#1A1A1F]">
                {[
                  { key: "rank" as const, label: "Rank", width: "60px" },
                  { key: "username" as const, label: "Player", width: "auto" },
                  { key: "wins" as const, label: "Wins", width: "80px" },
                  { key: "winRate" as const, label: "Win Rate", width: "110px" },
                  { key: "kda" as const, label: "KDA", width: "90px" },
                  { key: "deaths" as const, label: "Deaths", width: "90px" },
                  { key: "killAverage" as const, label: "Kill Avg", width: "100px" },
                  { key: "totalKills" as const, label: "Total Kills", width: "110px" },
                ].map((col) => (
                  <th
                    key={col.label}
                    className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em] cursor-pointer hover:text-[#8A8A95] transition-colors select-none"
                    style={{ width: col.width }}
                    onClick={() => (col.key !== "rank" ? toggleSort(col.key) : undefined)}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(255,255,255,0.03)]">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-10 bg-[#222228] rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : leaderboard?.players.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[14px] text-[#5A5A65]">
                    No players found
                  </td>
                </tr>
              ) : (
                leaderboard?.players.map((player: LeaderboardEntry, idx: number) => {
                  const rank = player.rank || idx + 1 + (page - 1) * 50;
                  const isTop3 = rank <= 3;
                  return (
                    <tr
                      key={player.playerId}
                      onClick={() => openPlayerModal(player.username)}
                      className="group border-b border-[rgba(255,255,255,0.03)] transition-all duration-150 hover:bg-[#1A1A1F] cursor-pointer"
                      style={{
                        borderLeft: isTop3 ? `3px solid ${rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32"}` : "3px solid transparent",
                      }}
                    >
                      <td className="px-4 py-3.5">
                        {isTop3 ? (
                          <Crown
                            className="w-4 h-4"
                            style={{
                              color: rank === 1 ? "#FFD700" : rank === 2 ? "#C0C0C0" : "#CD7F32",
                            }}
                          />
                        ) : (
                          <span className="text-[14px] font-bold text-[#5A5A65]">#{rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={player.avatarUrl || `https://mc-heads.net/avatar/${player.username}`}
                            alt={player.username}
                            className="w-8 h-8 rounded"
                            loading="lazy"
                          />
                          <div className="text-[14px] font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1.5">
                            <span style={{ color: getLevelColor(player.level) }}>{player.level}</span>
                            <img src={getStarIconPath(player.level)} alt="" className="w-3.5 h-3.5 object-contain" />
                            {getRankIconPath(player.rankKey) && (
                              <img src={getRankIconPath(player.rankKey)} alt="" className="h-3.5 w-auto object-contain" />
                            )}
                            <span style={{ color: getNameColor(player.rankKey) }}>{player.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[14px] text-[#8A8A95]">{formatNumber(player.wins)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-[60px] h-1 bg-[#222228] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#2ECC71] rounded-full"
                              style={{ width: `${(typeof player.winRate === "string" ? parseFloat(player.winRate) : player.winRate || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-[13px] text-[#8A8A95]">
                            {formatWinRate(player.winRate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#8A8A95]">{(player.kda ?? 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#8A8A95]">{formatNumber(player.deaths)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[13px] text-[#8A8A95]">{(player.killAverage ?? 0).toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[14px] font-semibold text-[#F0F0F2]">{formatNumber(player.totalKills)}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
