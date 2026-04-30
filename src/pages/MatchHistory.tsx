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
    const winnerCount = new Set(items.map((entry) => (entry.matchPublicId ?? entry.id).toLowerCase()).filter(Boolean)).size;
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
      <div className="relative mb-6 rounded-3xl border border-mn-lime/15 bg-[radial-gradient(circle_at_12%_18%,rgba(196,255,77,0.12),transparent_42%),radial-gradient(circle_at_88%_22%,rgba(46,196,182,0.1),transparent_40%),linear-gradient(145deg,#0A0F0C_0%,#050806_55%,#0C100E_100%)] p-5 sm:p-7 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none mn-grid-overlay opacity-40" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,transparent,rgba(232,237,229,0.02),transparent)] opacity-60" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-mn-lime/[0.06] px-3 py-1 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-mn-lime shadow-[0_0_10px_rgba(196,255,77,0.7)]" />
            <span className="text-[10px] uppercase tracking-[0.14em] text-mn-fog font-medium">Live server feed</span>
          </div>
        </div>
        <h1 className="relative font-display text-[34px] sm:text-[46px] font-bold text-mn-mist leading-none tracking-[-0.04em]">
          Battle royale match feed
        </h1>
        <p className="relative text-[14px] text-mn-fog mt-2 max-w-[720px] leading-relaxed">
          Recent server matches with winners, total players, and match duration at a glance.
        </p>
        {playerParam && (
          <div className="mt-3 relative">
            <Link
              to={`/player/${encodeURIComponent(playerParam)}`}
              className="inline-flex items-center gap-2 text-[13px] text-mn-lime hover:underline rounded-lg bg-mn-lime/10 border border-mn-lime/35 px-2.5 py-1.5"
            >
              Player focus: {playerParam}
            </Link>
          </div>
        )}

        <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <TopStat label="Total matches played" value={String(pageStats.totalMatchesPlayed)} accent="#C4FF4D" />
          <TopStat label="Winning teams" value={String(pageStats.uniqueWinners)} accent="#2ECC71" />
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
            <div key={idx} className="h-28 bg-mn-moss border border-white/[0.07] rounded-xl animate-pulse" />
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
              className="px-3 py-2 text-[13px] rounded-lg bg-mn-moss border border-white/[0.07] text-mn-fog disabled:opacity-40 hover:bg-mn-leaf transition-colors"
            >
              Prev
            </button>
            <span className="text-[13px] text-mn-fog">
              Page {page} / {totalPages}
              {isFetching && <span className="ml-2 text-mn-dim">Updating...</span>}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 text-[13px] rounded-lg bg-mn-moss border border-white/[0.07] text-mn-fog disabled:opacity-40 hover:bg-mn-leaf transition-colors"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="bg-mn-moss border border-white/[0.07] rounded-xl px-4 py-10 text-center text-[14px] text-mn-dim">
          No matches found with the selected filters.
        </div>
      )}
    </div>
  );
}

function TopStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.1] bg-mn-void/75 px-4 py-3.5 backdrop-blur-sm">
      <div className="w-10 h-1 rounded-full mb-2 shadow-[0_0_12px_currentColor]" style={{ backgroundColor: accent, color: accent }} />
      <p className="text-[10px] uppercase tracking-[0.11em] text-mn-dim mb-1">{label}</p>
      <p className="text-[26px] font-bold leading-none font-display text-mn-mist tracking-[-0.03em]">{value}</p>
    </div>
  );
}

