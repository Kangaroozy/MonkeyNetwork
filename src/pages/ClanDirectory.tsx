import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/providers/trpc";

function HeadTile({ username }: { username: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-mn-void/60 p-2 text-center">
      <img
        src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/48`}
        alt={username}
        className="mx-auto h-12 w-12 rounded object-cover"
        loading="lazy"
      />
      <p className="mt-1 truncate text-[11px] text-mn-fog">{username}</p>
    </div>
  );
}

export default function ClanDirectory() {
  const directoryQuery = trpc.clan.publicDirectory.useQuery(undefined, { retry: false });

  if (directoryQuery.isLoading) {
    return <div className="mx-auto max-w-[1200px] px-4 py-24 text-mn-fog">Loading clan directory...</div>;
  }

  if (directoryQuery.error) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan Directory</h1>
          <p className="mt-2 text-sm text-mn-fog">{directoryQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const data = directoryQuery.data;

  return (
    <div className="pb-16 pt-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-[13px] font-medium text-mn-fog transition-colors hover:text-mn-lime"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to leaderboards
        </Link>

        <header className="mb-8 rounded-2xl border border-white/[0.09] bg-mn-moss/60 p-6 shadow-[0_0_0_1px_rgba(196,255,77,0.04)_inset]">
          <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-mn-mist">Clan Directory</h1>
          <p className="mt-2 text-sm text-mn-fog">
            Public view of approved clans in <span className="text-mn-mist">{data?.event.name}</span>.
          </p>
        </header>

        <div className="space-y-6">
          {data?.clans.map((clan) => (
            <section key={clan.id} className="rounded-2xl border border-white/[0.09] bg-mn-moss/65 p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-mn-mist">{clan.name}</h2>
                  <p className="mt-1 text-xs text-mn-fog">
                    {clan.memberCount}/{data.event.maxMembersPerClan} members · Trim {clan.trim} · Material {clan.material}
                    {" · "}Color {clan.color}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
                <div className="rounded-xl border border-white/[0.1] bg-mn-void/70 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-mn-dim">Leader</p>
                  {clan.king ? (
                    <div className="overflow-hidden rounded-lg border border-white/[0.12] bg-black/25 p-2">
                      <img
                        src={`https://mc-heads.net/body/${encodeURIComponent(clan.king)}/right`}
                        alt={clan.king}
                        className="mx-auto h-56 w-auto max-w-full object-contain"
                        loading="lazy"
                      />
                      <p className="mt-2 text-center text-sm font-semibold text-mn-mist">{clan.king}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center text-xs text-mn-fog">
                      No leader assigned
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.1] bg-mn-void/60 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-mn-dim">Members</p>
                  {clan.members.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                      {clan.members.map((member) => (
                        <HeadTile key={`${clan.id}-${member}`} username={member} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-white/15 px-3 py-8 text-center text-xs text-mn-fog">
                      No additional members yet
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}

          {data?.clans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-mn-moss/45 px-4 py-12 text-center text-sm text-mn-fog">
              No approved clans available yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
