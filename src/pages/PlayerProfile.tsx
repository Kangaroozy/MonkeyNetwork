import { useParams, Link } from "react-router";
import { Crown, ArrowLeft, Trophy, Swords, Target, Calendar, Globe } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { MODES, MODE_LABELS, MODE_COLORS, getTierColor, getTierBgColor, formatNumber, formatWinRate } from "@/lib/tiers";
import { useState } from "react";

function TierBadge({ tier, size = "md" }: { tier: string | null; size?: "sm" | "md" | "lg" }) {
  const color = getTierColor(tier);
  const bg = getTierBgColor(tier);
  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-[12px] px-2.5 py-1",
    lg: "text-[18px] px-4 py-2",
  };
  return (
    <span
      className={`inline-flex items-center rounded font-bold ${sizeClasses[size]}`}
      style={{ color, backgroundColor: bg }}
    >
      {tier || "UNRANKED"}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color = "#F0F0F2" }: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  color?: string;
}) {
  return (
    <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6 hover:border-[rgba(255,255,255,0.12)] transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-[12px] font-medium text-[#5A5A65] uppercase tracking-[0.04em]">{label}</span>
      </div>
      <p className="text-[32px] font-bold leading-none mb-1" style={{ color }}>{value}</p>
      {subValue && <p className="text-[13px] text-[#8A8A95]">{subValue}</p>}
    </div>
  );
}

export default function PlayerProfile() {
  const { username } = useParams<{ username: string }>();
  const [activeMode, setActiveMode] = useState("overall");

  const { data: player, isLoading } = trpc.player.getByUsername.useQuery(
    { username: username || "" },
    { enabled: !!username }
  );

  const { data: matchHistory } = trpc.match.history.useQuery(
    { playerId: player?.id || 0, limit: 10 },
    { enabled: !!player?.id }
  );

  const { data: tierHistoryData } = trpc.match.tierHistory.useQuery(
    { playerId: player?.id || 0 },
    { enabled: !!player?.id }
  );

  if (isLoading) {
    return (
      <div className="pt-24 max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="animate-pulse">
          <div className="h-32 bg-[#222228] rounded-xl mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-[#222228] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="pt-24 max-w-[1280px] mx-auto px-4 sm:px-6 text-center py-24">
        <p className="text-[18px] text-[#8A8A95]">Player not found</p>
        <Link to="/" className="text-[14px] text-[#D4A843] hover:underline mt-4 inline-block">
          Back to Leaderboard
        </Link>
      </div>
    );
  }

  const currentModeStats = player.modeBreakdown?.find(m => m.modeSlug === activeMode);

  return (
    <div className="pt-16">
      {/* Profile Header */}
      <div className="relative h-[280px] flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#111114] via-[#0d0d10] to-[#0A0A0B]" />
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full blur-[120px]" style={{ backgroundColor: getTierColor(player.currentTier) }} />
        </div>

        <div className="relative z-10 max-w-[1280px] w-full mx-auto px-4 sm:px-6 pb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[13px] text-[#8A8A95] hover:text-[#F0F0F2] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leaderboard
          </Link>

          <div className="flex items-start gap-5">
            <img
              src={player.avatarUrl || `https://mc-heads.net/avatar/${player.username}`}
              alt={player.username}
              className="w-20 h-20 rounded-xl border-2"
              style={{ borderColor: player.globalRank && player.globalRank <= 10 ? "#D4A843" : "rgba(255,255,255,0.06)" }}
            />
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-[36px] font-extrabold text-[#F0F0F2] leading-none">{player.username}</h1>
                {player.globalRank && (
                  <span
                    className="px-3.5 py-1.5 rounded-full text-[14px] font-bold"
                    style={{
                      color: "#D4A843",
                      backgroundColor: "rgba(212, 168, 67, 0.15)",
                    }}
                  >
                    #{player.globalRank} Global
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[14px] text-[#8A8A95]">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  {player.region}
                </span>
                <span className="text-[#5A5A65]">·</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Member since {new Date(player.joinDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
                <span className="text-[#5A5A65]">·</span>
                <span>{formatNumber(player.matchesPlayed)} matches</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard
            icon={Trophy}
            label="Points"
            value={formatNumber(player.totalPoints)}
            subValue={`Global Rank #${player.globalRank || "-"}`}
            color="#F0F0F2"
          />
          <StatCard
            icon={Target}
            label="Win Rate"
            value={formatWinRate(player.winRate)}
            subValue={`${formatNumber(player.totalWins)}W / ${formatNumber(player.totalLosses)}L`}
            color="#2ECC71"
          />
          <StatCard
            icon={Crown}
            label="Current Tier"
            value={player.currentTier}
            subValue={`Highest: ${player.highestTier}`}
            color={getTierColor(player.currentTier)}
          />
          <StatCard
            icon={Swords}
            label="Matches Played"
            value={formatNumber(player.matchesPlayed)}
            subValue="All time"
            color="#F0F0F2"
          />
        </div>

        {/* Mode Breakdown */}
        <div className="mb-10">
          <h2 className="text-[20px] font-bold text-[#F0F0F2] mb-4">Mode Breakdown</h2>
          <div className="flex gap-1 mb-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveMode(mode)}
                className="px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-200 shrink-0"
                style={{
                  color: activeMode === mode ? "#F0F0F2" : "#8A8A95",
                  backgroundColor: activeMode === mode ? "rgba(255,255,255,0.06)" : "transparent",
                  borderBottom: activeMode === mode ? `2px solid ${MODE_COLORS[mode]}` : "2px solid transparent",
                }}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          {activeMode === "overall" ? (
            <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {player.modeBreakdown?.map((mode) => (
                  <div key={mode.modeSlug} className="group">
                    <p className="text-[11px] font-medium text-[#5A5A65] uppercase tracking-[0.04em] mb-1">{mode.modeName}</p>
                    <div className="flex items-center gap-2">
                      <TierBadge tier={mode.tier} size="sm" />
                      <span className="text-[14px] font-semibold text-[#F0F0F2]">#{mode.rankPosition || "-"}</span>
                    </div>
                    <p className="text-[12px] text-[#8A8A95] mt-1">{formatNumber(mode.points)} pts</p>
                  </div>
                ))}
              </div>
            </div>
          ) : currentModeStats ? (
            <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Mode Rank", value: `#${currentModeStats.rankPosition || "-"}` },
                  { label: "Tier", value: <TierBadge tier={currentModeStats.tier} /> },
                  { label: "Points", value: formatNumber(currentModeStats.points) },
                  { label: "Matches", value: formatNumber(currentModeStats.matchesPlayed) },
                  { label: "Wins", value: formatNumber(currentModeStats.wins) },
                  { label: "Losses", value: formatNumber(currentModeStats.losses) },
                  { label: "Win Rate", value: formatWinRate(currentModeStats.winRate) },
                  { label: "Best Streak", value: formatNumber(currentModeStats.bestStreak) },
                ].map((stat) => (
                  <div key={stat.label}>
                    <p className="text-[11px] font-medium text-[#5A5A65] uppercase tracking-[0.04em] mb-1.5">{stat.label}</p>
                    <div className="text-[18px] font-bold text-[#F0F0F2]">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-8 text-center">
              <p className="text-[14px] text-[#5A5A65]">No data for this mode</p>
            </div>
          )}
        </div>

        {/* Match History */}
        <div className="mb-10">
          <h2 className="text-[20px] font-bold text-[#F0F0F2] mb-4">Match History</h2>
          <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
            {matchHistory && matchHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#1A1A1F]">
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Date</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Opponent</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Mode</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Result</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Score</th>
                      <th className="text-left px-4 py-3 text-[12px] font-semibold text-[#5A5A65] uppercase tracking-[0.04em]">Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchHistory.map((match) => (
                      <tr key={match.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[#1A1A1F] transition-colors">
                        <td className="px-4 py-3 text-[13px] text-[#8A8A95]">
                          {new Date(match.playedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-medium text-[#F0F0F2]">{match.opponentName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[12px] font-medium px-2 py-0.5 rounded"
                            style={{
                              color: MODE_COLORS[match.modeSlug] || "#8A8A95",
                              backgroundColor: (MODE_COLORS[match.modeSlug] || "#8A8A95") + "20",
                            }}
                          >
                            {match.modeName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[13px] font-semibold"
                            style={{
                              color: match.result === "WIN" ? "#2ECC71" : match.result === "LOSS" ? "#E74C3C" : "#8A8A95",
                            }}
                          >
                            {match.result}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[#8A8A95]">
                          {match.playerScore} - {match.opponentScore}
                        </td>
                        <td className="px-4 py-3">
                          {match.tierChange ? <TierBadge tier={match.tierChange} size="sm" /> : <span className="text-[13px] text-[#5A5A65]">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[14px] text-[#5A5A65]">No match history available</div>
            )}
          </div>
        </div>

        {/* Tier History */}
        {tierHistoryData && tierHistoryData.length > 0 && (
          <div>
            <h2 className="text-[20px] font-bold text-[#F0F0F2] mb-4">Tier History</h2>
            <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
              <div className="relative">
                <div className="absolute top-6 left-0 right-0 h-0.5 bg-[#222228]" />
                <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
                  {tierHistoryData.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="relative flex-shrink-0 w-32 text-center z-10">
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-2 border-2 border-[#111114]"
                        style={{ backgroundColor: getTierColor(entry.newTier) }}
                      />
                      <TierBadge tier={entry.newTier} size="sm" />
                      <p className="text-[11px] text-[#8A8A95] mt-1.5">{entry.modeName}</p>
                      <p className="text-[11px] text-[#5A5A65]">
                        {new Date(entry.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      {entry.oldTier !== entry.newTier && (
                        <p className="text-[10px] text-[#5A5A65] mt-0.5">
                          {entry.oldTier} → {entry.newTier}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
