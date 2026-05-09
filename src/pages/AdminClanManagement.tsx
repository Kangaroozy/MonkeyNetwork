import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Lock, Unlock } from "lucide-react";
import { trpc } from "@/providers/trpc";

export default function AdminClanManagement() {
  const meQuery = trpc.clan.me.useQuery(undefined, { retry: false });
  const clansQuery = trpc.clan.adminListClans.useQuery(undefined, {
    enabled: meQuery.data?.isAdmin === true,
  });

  const [lockAtInput, setLockAtInput] = useState("");
  const [declineReasonByClan, setDeclineReasonByClan] = useState<Record<number, string>>({});
  const [lockAction, setLockAction] = useState<"set" | "clear" | null>(null);
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetNotice, setResetNotice] = useState("");

  const setLockMutation = trpc.clan.adminSetLockAt.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
    },
    onSettled: () => {
      setLockAction(null);
    },
  });
  const reviewClanMutation = trpc.clan.adminReviewClan.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
    },
  });
  const resetPasswordMutation = trpc.clan.adminResetAccountPassword.useMutation({
    onSuccess: (payload) => {
      setResetNotice(`Password reset for ${payload.minecraftUsername}.`);
      setResetPassword("");
    },
  });

  const errorMessage = useMemo(() => {
    return (
      meQuery.error?.message ??
      clansQuery.error?.message ??
      setLockMutation.error?.message ??
      reviewClanMutation.error?.message ??
      resetPasswordMutation.error?.message
    );
  }, [
    clansQuery.error?.message,
    meQuery.error?.message,
    resetPasswordMutation.error?.message,
    setLockMutation.error?.message,
    reviewClanMutation.error?.message,
  ]);

  if (meQuery.isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-mn-fog">Checking admin access...</div>;
  }
  if (meQuery.error || !meQuery.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan Admin Panel</h1>
          <p className="mt-3 text-mn-fog">Admin role required. Login with your Minecraft username/password account.</p>
        </div>
      </div>
    );
  }

  const currentLockAt = clansQuery.data?.event.lockAt ? new Date(clansQuery.data.event.lockAt) : null;
  const statusTone = (status: "PENDING" | "APPROVED" | "DECLINED") => {
    if (status === "PENDING") {
      return {
        card: "border-amber-400/45 bg-amber-500/5",
        badge: "border-amber-400/45 bg-amber-500/10 text-amber-200",
      };
    }
    if (status === "APPROVED") {
      return {
        card: "border-mn-lime/45 bg-mn-lime/5",
        badge: "border-mn-lime/45 bg-mn-lime/10 text-mn-lime",
      };
    }
    return {
      card: "border-red-400/45 bg-red-500/5",
      badge: "border-red-400/45 bg-red-500/10 text-red-200",
    };
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h1 className="text-2xl font-bold text-mn-mist">Clan Admin Panel</h1>
        <p className="mt-2 text-sm text-mn-fog">
          Active event: <span className="text-mn-mist">{clansQuery.data?.event.name ?? "-"}</span>
        </p>
        <p className="mt-1 text-sm text-mn-fog">
          Total clans: <span className="text-mn-mist">{clansQuery.data?.clans.length ?? 0}</span>
        </p>
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Clan Approval Queue</h2>
        <p className="mt-1 text-sm text-mn-fog">Approve or decline new clan submissions for this event.</p>
        <div className="mt-4 space-y-3">
          {clansQuery.data?.clans.filter((clan) => clan.reviewStatus === "PENDING").length ? (
            clansQuery.data?.clans
              .filter((clan) => clan.reviewStatus === "PENDING")
              .map((clan) => (
                <div key={`queue-${clan.id}`} className="rounded-lg border border-amber-400/45 bg-amber-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-mn-mist">{clan.name}</p>
                      <p className="text-xs text-mn-fog">
                        {clan.memberCount}/{clansQuery.data?.event.maxMembersPerClan ?? 0} members
                      </p>
                      <p className="mt-1 text-xs text-mn-fog">Discord: {clan.discordServerLink ?? "Not provided"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => reviewClanMutation.mutate({ clanId: clan.id, status: "APPROVED" })}
                        disabled={reviewClanMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-md border border-mn-lime/40 bg-mn-lime/15 px-3 py-2 text-xs font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
                      >
                        {reviewClanMutation.isPending ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                        ) : null}
                        Accept
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={declineReasonByClan[clan.id] ?? ""}
                      onChange={(event) =>
                        setDeclineReasonByClan((prev) => ({ ...prev, [clan.id]: event.target.value }))
                      }
                      className="flex-1 rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                      placeholder="Decline reason (required if declining)"
                    />
                    <button
                      type="button"
                      disabled={reviewClanMutation.isPending || !(declineReasonByClan[clan.id] ?? "").trim()}
                      onClick={() =>
                        reviewClanMutation.mutate({
                          clanId: clan.id,
                          status: "DECLINED",
                          reason: (declineReasonByClan[clan.id] ?? "").trim(),
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 active:scale-[0.98] disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
          ) : (
            <p className="text-sm text-mn-fog">No clans are currently waiting for approval.</p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Event Lock</h2>
        <p className="mt-1 text-sm text-mn-fog">
          Current deadline:{" "}
          <span className="text-mn-mist">
            {currentLockAt ? currentLockAt.toLocaleString() : "Not set"}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="datetime-local"
            value={lockAtInput}
            onChange={(event) => setLockAtInput(event.target.value)}
            className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
          />
          <button
            type="button"
            onClick={() => {
              const iso = lockAtInput ? new Date(lockAtInput).toISOString() : null;
              setLockAction("set");
              setLockMutation.mutate({ lockAtIso: iso });
            }}
            disabled={setLockMutation.isPending}
            className={`inline-flex items-center gap-2 rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60 ${
              lockAction === "set" && setLockMutation.isPending ? "shadow-[0_0_18px_rgba(196,255,77,0.28)]" : ""
            }`}
          >
            {setLockMutation.isPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
            ) : null}
            <Lock className={`h-3.5 w-3.5 ${lockAction === "set" && setLockMutation.isPending ? "animate-pulse" : ""}`} />
            Set Lock Deadline
          </button>
          <button
            type="button"
            onClick={() => {
              setLockAction("clear");
              setLockMutation.mutate({ lockAtIso: null });
            }}
            disabled={setLockMutation.isPending}
            className={`inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist active:scale-[0.98] disabled:opacity-60 ${
              lockAction === "clear" && setLockMutation.isPending ? "shadow-[0_0_16px_rgba(255,255,255,0.1)]" : ""
            }`}
          >
            {setLockMutation.isPending && lockAction === "clear" ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-mn-mist" />
            ) : null}
            <Unlock className={`h-3.5 w-3.5 ${lockAction === "clear" && setLockMutation.isPending ? "animate-pulse" : ""}`} />
            Clear Lock
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Account Password Reset</h2>
        <p className="mt-1 text-sm text-mn-fog">Reset a player password if they forgot their login.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={resetUsername}
            onChange={(event) => setResetUsername(event.target.value)}
            className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            placeholder="Account Username"
          />
          <input
            type="password"
            value={resetPassword}
            onChange={(event) => setResetPassword(event.target.value)}
            className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            placeholder="New Password (min 8 chars)"
          />
          <button
            type="button"
            onClick={() =>
              resetPasswordMutation.mutate({
                username: resetUsername,
                newPassword: resetPassword,
              })
            }
            disabled={resetPasswordMutation.isPending || resetPassword.length < 8 || !resetUsername.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
          >
            {resetPasswordMutation.isPending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
            ) : null}
            Reset Password
          </button>
        </div>
        {resetNotice ? (
          <p className="mt-3 rounded-md border border-mn-lime/40 bg-mn-lime/10 px-3 py-2 text-sm text-mn-lime">
            {resetNotice}
          </p>
        ) : null}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clansQuery.data?.clans.map((clan) => (
          <Link
            to={`/admin/clans/${clan.id}`}
            key={`overview-${clan.id}`}
            className={`rounded-xl border bg-mn-moss/70 p-4 transition-all hover:bg-mn-leaf/40 ${statusTone(clan.reviewStatus).card}`}
          >
            <p className="text-sm font-semibold text-mn-mist">{clan.name}</p>
            <p className="mt-1 text-xs text-mn-fog">
              {clan.memberCount}/{clansQuery.data?.event.maxMembersPerClan ?? 0} members
            </p>
            <p className="mt-1 text-xs text-mn-fog">
              Trim {clan.trim} · Material {clan.material} · Color {clan.color}
            </p>
            <p className={`mt-2 inline-flex rounded-md border px-2 py-1 text-[11px] font-semibold ${statusTone(clan.reviewStatus).badge}`}>
              {clan.reviewStatus}
            </p>
            <p className="mt-3 inline-flex rounded-md border border-mn-lime/40 bg-mn-lime/10 px-2 py-1 text-xs font-semibold text-mn-lime">
              Open Edit Page
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
