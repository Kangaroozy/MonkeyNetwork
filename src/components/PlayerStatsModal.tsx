import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { PLAYER_MODAL_EVENT } from "@/lib/playerModal";

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

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={() => setUsername(null)}
    >
      <div
        className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(212,168,67,0.18),_rgba(17,17,20,0.96)_45%)] p-6 sm:p-8 shadow-[0_40px_120px_rgba(0,0,0,0.65)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#8A8A95]">Player Overview</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F0F0F2] mt-1">
              {data?.username ?? username}
            </h3>
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
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 flex flex-col items-center">
              <img
                src={data.avatarUrl || `https://mc-heads.net/avatar/${data.username}/128`}
                alt={data.username}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl"
              />
              <p className="mt-3 text-xs text-[#8A8A95]">UUID</p>
              <p className="text-[11px] text-[#C2C2CC] break-all text-center">{data.id}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Win Rate" value={`${winRate}%`} />
              <StatCard label="KDA" value={data.kda.toFixed(2)} />
              <StatCard label="Kill Avg" value={data.killAverage.toFixed(2)} />
              <StatCard label="Kills" value={data.kills.toLocaleString()} />
              <StatCard label="Deaths" value={data.deaths.toLocaleString()} />
              <StatCard label="Matches" value={data.matchesPlayed.toLocaleString()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#8A8A95]">{label}</p>
      <p className="text-lg font-bold text-[#F0F0F2] mt-1">{value}</p>
    </div>
  );
}
