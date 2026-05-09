import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";

function MemberHead({ username }: { username: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-mn-void/60 p-2 text-center">
      <img
        src={`https://mc-heads.net/avatar/${encodeURIComponent(username)}/40`}
        alt={username}
        className="mx-auto h-10 w-10 rounded object-cover"
        loading="lazy"
      />
      <p className="mt-1 truncate text-[10px] text-mn-fog">{username}</p>
    </div>
  );
}

export default function ClanPublicPage() {
  const utils = trpc.useUtils();
  const meQuery = trpc.clan.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const directoryQuery = trpc.clan.publicDirectory.useQuery(undefined, { retry: false });
  const [logoutPending, setLogoutPending] = useState(false);
  const createButtonLabel = "Create a Clan Here";
  const loggedInUsername = meQuery.data?.minecraftUsername ?? null;

  async function handleLogout() {
    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      await utils.clan.me.invalidate();
      await meQuery.refetch();
      window.location.href = "/clans";
    } finally {
      setLogoutPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <div className="mb-6 rounded-xl border border-mn-lime/40 bg-[linear-gradient(120deg,rgba(196,255,77,0.15),rgba(102,255,220,0.12))] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-mn-mist">Clan War Event</h1>
          {loggedInUsername ? (
            <div className="inline-flex items-center gap-3 rounded-lg border border-white/20 bg-mn-void/55 px-3 py-2">
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(loggedInUsername)}/32`}
                alt={loggedInUsername}
                className="h-8 w-8 rounded object-cover"
                loading="lazy"
              />
              <p className="text-xs text-mn-fog whitespace-nowrap">
                Logged in as <span className="font-semibold text-mn-mist">{loggedInUsername}</span>
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutPending}
                className="rounded-md border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-mn-fog transition-colors hover:text-mn-mist active:scale-[0.98] disabled:opacity-60"
              >
                {logoutPending ? "Logging out..." : "Logout"}
              </button>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-mn-fog">
          Browse approved clans below. Ready to register yours? Start the clan setup flow.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/clans/create"
            className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-5 py-3 text-base font-bold text-mn-lime shadow-[0_0_22px_rgba(196,255,77,0.22)] transition-all hover:bg-mn-lime/20 active:scale-[0.98]"
          >
            {createButtonLabel}
          </Link>
          {meQuery.isSuccess ? (
            <Link
              to="/clans/manage"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist"
            >
              Manage My Clan
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Current Clans</h2>
        {directoryQuery.isLoading ? (
          <p className="mt-3 text-sm text-mn-fog">Loading clans...</p>
        ) : directoryQuery.error ? (
          <p className="mt-3 text-sm text-red-200">{directoryQuery.error.message}</p>
        ) : (
          <div className="mt-4 space-y-4">
            {directoryQuery.data?.clans.map((clan) => (
              <div key={clan.id} className="rounded-lg border border-white/10 bg-mn-void/40 p-4">
                <p className="text-sm font-semibold text-mn-mist">{clan.name}</p>
                <p className="mt-1 text-xs text-mn-fog">
                  {clan.memberCount}/{directoryQuery.data?.event.maxMembersPerClan ?? 10} members
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-[170px_1fr]">
                  <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <p className="mb-1 text-[11px] text-mn-fog">King</p>
                    {clan.king ? (
                      <>
                        <img
                          src={`https://mc-heads.net/body/${encodeURIComponent(clan.king)}/right`}
                          alt={clan.king}
                          className="mx-auto h-32 w-auto object-contain"
                          loading="lazy"
                        />
                        <p className="mt-1 text-center text-xs text-mn-mist">{clan.king}</p>
                      </>
                    ) : (
                      <p className="text-xs text-mn-fog">No king set</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[11px] text-mn-fog">Members</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                      {clan.members.map((member) => (
                        <MemberHead key={`${clan.id}-${member}`} username={member} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {directoryQuery.data?.clans.length === 0 ? (
              <p className="text-sm text-mn-fog">No approved clans yet.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
