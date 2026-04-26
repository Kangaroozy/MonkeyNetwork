import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { MatchDateWindow } from "@contracts/match-history";
import { trpc } from "@/providers/trpc";
import MatchHistoryFilters from "@/components/match-history/MatchHistoryFilters";
import MatchHistoryCard from "@/components/match-history/MatchHistoryCard";

const PAGE_SIZE = 12;

function parseDateWindow(value: string | null): MatchDateWindow {
  if (value === "24h" || value === "7d" || value === "30d" || value === "all") return value;
  return "all";
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export default function MatchHistory() {
  const [searchParams, setSearchParams] = useSearchParams();

  const playerParam = searchParams.get("player")?.trim() ?? "";
  const [mode, setMode] = useState<string>(searchParams.get("mode") ?? "");
  const [dateWindow, setDateWindow] = useState<MatchDateWindow>(parseDateWindow(searchParams.get("window")));
  const [page, setPage] = useState(parsePage(searchParams.get("page")));

  const { data: filterData } = trpc.match.filters.useQuery();
  const { data, isLoading, isFetching } = trpc.match.list.useQuery({
    playerUsername: playerParam || undefined,
    mode: mode || undefined,
    winsOnly: false,
    dateWindow,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  const pageStats = useMemo(() => {
    const items = data?.items ?? [];
    const winnerCount = new Set(items.map((entry) => (entry.playerUsername ?? "").toLowerCase()).filter(Boolean)).size;
    const totalKills = items.reduce((sum, entry) => sum + (entry.kills ?? entry.playerScore ?? 0), 0);
    return {
      matches: items.length,
      totalMatchesPlayed: data?.total ?? 0,
      uniqueWinners: winnerCount,
      totalKills,
    };
  }, [data?.items, data?.total]);

  const updateSearch = (next: { mode?: string; dateWindow?: MatchDateWindow; page?: number }) => {
    const modeValue = next.mode ?? mode;
    const windowValue = next.dateWindow ?? dateWindow;
    const pageValue = next.page ?? page;

    const nextParams = new URLSearchParams(searchParams);
    if (playerParam) nextParams.set("player", playerParam);
    if (modeValue) nextParams.set("mode", modeValue);
    else nextParams.delete("mode");
    nextParams.delete("wins");
    if (windowValue !== "all") nextParams.set("window", windowValue);
    else nextParams.delete("window");
    if (pageValue > 1) nextParams.set("page", String(pageValue));
    else nextParams.delete("page");
    setSearchParams(nextParams, { replace: true });
  };

  const onModeChange = (nextMode: string) => {
    setMode(nextMode);
    setPage(1);
    updateSearch({ mode: nextMode, page: 1 });
  };

  const onDateWindowChange = (nextWindow: MatchDateWindow) => {
    setDateWindow(nextWindow);
    setPage(1);
    updateSearch({ dateWindow: nextWindow, page: 1 });
  };

  const onPageChange = (nextPage: number) => {
    setPage(nextPage);
    updateSearch({ page: nextPage });
  };

  return (
    <div className="pt-24 max-w-[1280px] mx-auto px-4 sm:px-6 pb-16">
      <div className="relative mb-6 rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[radial-gradient(circle_at_15%_20%,rgba(212,168,67,0.16),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(155,89,182,0.14),transparent_42%),linear-gradient(140deg,#111116_0%,#0D0D11_65%,#14101F_100%)] p-5 sm:p-7 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.03),transparent)] opacity-50" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-1 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#2ECC71]" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-[#9A9AA5]">Live Server Feed</span>
          </div>
        </div>
        <h1 className="relative text-[34px] sm:text-[46px] font-extrabold text-[#F0F0F2] leading-none tracking-[-0.01em]">
          Battle Royale Match Feed
        </h1>
        <p className="relative text-[14px] text-[#9A9AA5] mt-2 max-w-[720px]">
          Recent server matches with winners, total players, and match duration at a glance.
        </p>
        {playerParam && (
          <div className="mt-3 relative">
            <Link
              to={`/player/${encodeURIComponent(playerParam)}`}
              className="inline-flex items-center gap-2 text-[13px] text-[#D4A843] hover:underline rounded-lg bg-[rgba(212,168,67,0.1)] border border-[rgba(212,168,67,0.35)] px-2.5 py-1.5"
            >
              Player focus: {playerParam}
            </Link>
          </div>
        )}

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <TopStat label="Total matches played" value={String(pageStats.totalMatchesPlayed)} accent="#D4A843" />
          <TopStat label="Unique winners" value={String(pageStats.uniqueWinners)} accent="#2ECC71" />
          <TopStat label="Total kills" value={String(pageStats.totalKills)} accent="#9B59B6" />
        </div>
      </div>

      <MatchHistoryFilters
        modes={filterData?.modes ?? []}
        mode={mode}
        dateWindow={dateWindow}
        onModeChange={onModeChange}
        onDateWindowChange={onDateWindowChange}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="h-28 bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.items.map((match) => (
              <MatchHistoryCard key={match.id} match={match} showPrimaryPlayer={false} view="global" />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-2 text-[13px] rounded-lg bg-[#111114] border border-[rgba(255,255,255,0.06)] text-[#8A8A95] disabled:opacity-40 hover:bg-[#1A1A1F] transition-colors"
            >
              Prev
            </button>
            <span className="text-[13px] text-[#8A8A95]">
              Page {page} / {totalPages}
              {isFetching && <span className="ml-2 text-[#5A5A65]">Updating...</span>}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-[13px] rounded-lg bg-[#111114] border border-[rgba(255,255,255,0.06)] text-[#8A8A95] disabled:opacity-40 hover:bg-[#1A1A1F] transition-colors"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="bg-[#111114] border border-[rgba(255,255,255,0.06)] rounded-xl px-4 py-10 text-center text-[14px] text-[#5A5A65]">
          No matches found with the selected filters.
        </div>
      )}
    </div>
  );
}

function TopStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(9,9,12,0.7)] px-4 py-3.5 backdrop-blur-[1px]">
      <div className="w-10 h-1 rounded-full mb-2" style={{ backgroundColor: accent }} />
      <p className="text-[10px] uppercase tracking-[0.11em] text-[#747480] mb-1">{label}</p>
      <p className="text-[26px] font-extrabold leading-none text-[#F0F0F2]">{value}</p>
    </div>
  );
}

