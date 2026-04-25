import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PLAYER_MODAL_EVENT } from "@/lib/playerModal";
import { getLevelColor, getNameColor, getRankIconPath, getStarIconPath } from "@/lib/playerStyle";

export default function PlayerStatsModal() {
  const [username, setUsername] = useState<string | null>(null);
  const { data, isFetching } = trpc.player.previewByUsername.useQuery(
    { username: username ?? "" },
    { enabled: Boolean(username) },
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ username: string }>;
      const next = custom.detail?.username?.trim();
      if (next) {
        setUsername(next);
      }
    };
    window.addEventListener(PLAYER_MODAL_EVENT, handler as EventListener);
    return () => window.removeEventListener(PLAYER_MODAL_EVENT, handler as EventListener);
  }, []);

  const open = Boolean(username);
  const winRate = useMemo(() => ((data?.winRate ?? 0) * 100).toFixed(1), [data?.winRate]);
  const expProgress = useMemo(() => Math.round((data?.expProgress ?? 0) * 100), [data?.expProgress]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center px-3 sm:px-4 py-4"
      onClick={() => setUsername(null)}
    >
      <div
        className="w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-[22px] sm:rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,168,67,0.18),_rgba(17,17,20,0.96)_45%)] p-4 sm:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8A8A95]">Player Overview</p>
            <div className="mt-1 flex items-center gap-2 min-w-0">
              {data && getRankIconPath(data.rankKey) && (
                <img
                  src={getRankIconPath(data.rankKey)}
                  alt="Rank"
                  className="h-6 w-auto shrink-0 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              <h3
                className="text-xl sm:text-3xl font-extrabold truncate"
                style={{ color: data ? getNameColor(data.rankKey) : "#F0F0F2" }}
              >
                {data?.username ?? username}
              </h3>
            </div>
          </div>
          <button
            onClick={() => setUsername(null)}
            className="rounded-xl p-2 text-[#8A8A95] hover:text-[#F0F0F2] hover:bg-white/5 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isFetching || !data ? (
          <div className="mt-6 h-44 rounded-2xl bg-white/5 animate-pulse" />
        ) : (
          <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-[230px_1fr] gap-4 sm:gap-6">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col items-center">
              <div className="relative w-full h-36 sm:h-44 rounded-xl border border-white/10 bg-[#0c0c10] overflow-hidden">
                <img
                  src={`https://mc-heads.net/body/${encodeURIComponent(data.username)}/right`}
                  alt={`${data.username} model`}
                  className="absolute left-1/2 -translate-x-1/2 top-1 h-[138px] sm:h-[170px] w-auto"
                />
              </div>
              <div className="mt-3 flex items-center gap-2 whitespace-nowrap">
                <img src={getStarIconPath(data.level)} alt="" className="w-4 h-4 object-contain" />
                <span className="text-sm font-semibold" style={{ color: getLevelColor(data.level) }}>
                  Level {data.level}
                </span>
              </div>
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between text-[11px] text-[#8A8A95] mb-1">
                  <span>EXP</span>
                  <span>{data.expCurrent.toLocaleString()} / {data.expRequired.toLocaleString()}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2ECC71]"
                    style={{ width: `${expProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <StatCard label="Win Rate" value={`${winRate}%`} />
              <StatCard label="KDA" value={data.kda.toFixed(2)} />
              <StatCard label="Kill Avg" value={data.killAverage.toFixed(2)} />
              <StatCard label="Kills" value={data.kills.toLocaleString()} />
              <StatCard label="Deaths" value={data.deaths.toLocaleString()} />
              <StatCard label="Matches" value={data.matchesPlayed.toLocaleString()} />
              <StatCard label="Wins" value={data.wins.toLocaleString()} />
              <StatCard label="Losses" value={data.losses.toLocaleString()} />
              <StatCard label="EXP %" value={`${expProgress}%`} />
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-black/20 px-3 sm:px-4 py-2.5 sm:py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#8A8A95]">{label}</p>
      <p className="text-[16px] sm:text-lg font-bold text-[#F0F0F2] mt-1">{value}</p>
    </div>
  );
}
