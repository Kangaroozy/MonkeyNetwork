import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import ClanRosterTable from "@/components/clan/ClanRosterTable";
import ClanSettingsForm from "@/components/clan/ClanSettingsForm";

const CLAN_NAME_REGEX = /^[A-Za-z0-9 ]+$/;
const CLAN_NAME_MAX_LENGTH = 14;

type ClashTrim =
  | "SENTRY"
  | "VEX"
  | "WILD"
  | "COAST"
  | "DUNE"
  | "WAYFINDER"
  | "RAISER"
  | "SHAPER"
  | "HOST"
  | "WARD"
  | "SILENCE"
  | "TIDE"
  | "SNOUT"
  | "RIB"
  | "EYE"
  | "SPIRE";

type ClashMaterial =
  | "QUARTZ"
  | "IRON"
  | "NETHERITE"
  | "REDSTONE"
  | "COPPER"
  | "GOLD"
  | "EMERALD"
  | "DIAMOND"
  | "LAPIS"
  | "AMETHYST";

type ClashColor =
  | "BLACK"
  | "DARK_BLUE"
  | "DARK_GREEN"
  | "DARK_AQUA"
  | "DARK_RED"
  | "DARK_PURPLE"
  | "GOLD"
  | "GRAY"
  | "DARK_GRAY"
  | "BLUE"
  | "GREEN"
  | "AQUA"
  | "RED"
  | "LIGHT_PURPLE"
  | "YELLOW"
  | "WHITE";

function useAuthState() {
  return trpc.clan.me.useQuery(undefined, {
    retry: false,
  });
}

export default function ClanManagement() {
  const authQuery = useAuthState();
  const optionsQuery = trpc.clan.options.useQuery();
  const myClanQuery = trpc.clan.myClan.useQuery(undefined, {
    enabled: authQuery.isSuccess,
  });
  const utils = trpc.useUtils();

  const [memberName, setMemberName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authSuccessFlash, setAuthSuccessFlash] = useState(false);

  const trims = optionsQuery.data?.trims ?? [];
  const materials = optionsQuery.data?.materials ?? [];
  const colors = optionsQuery.data?.colors ?? [];

  const [trim, setTrim] = useState<ClashTrim>("SENTRY");
  const [material, setMaterial] = useState<ClashMaterial>("IRON");
  const [color, setColor] = useState<ClashColor>("WHITE");
  const [clanName, setClanName] = useState("");
  const [discordServerLink, setDiscordServerLink] = useState("");
  const createButtonLabel = authQuery.isSuccess ? "Create a Clan Here" : "Create a Clan Here (Login Required)";

  const updateSettingsMutation = trpc.clan.updateMyClanSettings.useMutation({
    onSuccess: async () => {
      await utils.clan.myClan.invalidate();
    },
  });
  const addMemberMutation = trpc.clan.myAddMember.useMutation({
    onSuccess: async () => {
      await utils.clan.myClan.invalidate();
      setMemberName("");
    },
  });
  const removeMemberMutation = trpc.clan.myRemoveMember.useMutation({
    onSuccess: async () => {
      await utils.clan.myClan.invalidate();
    },
  });
  const setLeaderMutation = trpc.clan.mySetLeader.useMutation({
    onSuccess: async () => {
      await utils.clan.myClan.invalidate();
    },
  });
  const submitForReviewMutation = trpc.clan.mySubmitClanForReview.useMutation({
    onSuccess: async () => {
      await utils.clan.myClan.invalidate();
    },
  });

  useEffect(() => {
    const clan = myClanQuery.data?.clan;
    if (!clan) return;
    setTrim(clan.trim as ClashTrim);
    setMaterial(clan.material as ClashMaterial);
    setColor((clan.color as ClashColor) ?? "WHITE");
    setClanName(clan.name);
    setDiscordServerLink(clan.discordServerLink ?? "");
  }, [myClanQuery.data?.clan]);

  async function handleAuth() {
    setAuthError("");
    setAuthLoading(true);
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword,
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setAuthError(payload.error ?? "Authentication failed.");
        return;
      }
      setAuthPassword("");
      setAuthSuccessFlash(true);
      await authQuery.refetch();
      await myClanQuery.refetch();
    } catch {
      setAuthError("Unable to reach auth service.");
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    if (!authSuccessFlash) return;
    const timer = window.setTimeout(() => setAuthSuccessFlash(false), 700);
    return () => window.clearTimeout(timer);
  }, [authSuccessFlash]);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    await authQuery.refetch();
    await myClanQuery.refetch();
  }

  const errorMessage = useMemo(() => {
    if (authError) {
      return authError;
    }
    return (
      updateSettingsMutation.error?.message ??
      addMemberMutation.error?.message ??
      removeMemberMutation.error?.message ??
      setLeaderMutation.error?.message ??
      submitForReviewMutation.error?.message ??
      authQuery.error?.message ??
      myClanQuery.error?.message
    );
  }, [
    authError,
    addMemberMutation.error?.message,
    authQuery.error?.message,
    myClanQuery.error?.message,
    removeMemberMutation.error?.message,
    setLeaderMutation.error?.message,
    submitForReviewMutation.error?.message,
    updateSettingsMutation.error?.message,
  ]);

  const cleanClanName = clanName.trim();
  const clanNameValidationError = useMemo(() => {
    if (!cleanClanName) return "Clan name is required.";
    if (cleanClanName.length < 2) return "Clan name must be at least 2 characters.";
    if (cleanClanName.length > CLAN_NAME_MAX_LENGTH) return "Clan name must be less than 15 characters.";
    if (!CLAN_NAME_REGEX.test(cleanClanName)) {
      return "Clan name can only contain letters, numbers, and spaces.";
    }
    return "";
  }, [cleanClanName]);

  if (authQuery.isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-24 text-mn-fog">Checking account session...</div>;
  }

  if (authQuery.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="mb-6 rounded-xl border border-mn-lime/40 bg-[linear-gradient(120deg,rgba(196,255,77,0.15),rgba(102,255,220,0.12))] p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan War Event</h1>
          <p className="mt-2 text-sm text-mn-fog">
            Ready to register your team? Start the clan setup flow.
          </p>
          <button
            type="button"
            onClick={() => document.getElementById("clan-auth")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-5 py-3 text-base font-bold text-mn-lime shadow-[0_0_22px_rgba(196,255,77,0.22)] transition-all hover:bg-mn-lime/20 active:scale-[0.98]"
          >
            {createButtonLabel}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <div id="clan-auth" />
          <h1 className="text-2xl font-bold text-mn-mist">Clash Clan Manager</h1>
          <p className="mt-3 text-mn-fog">
            Sign in using your account username and password. This username is linked to your account.
          </p>
          <div className="mt-3 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Only clan leaders should create accounts. Players who are not leading a clan should not register.
          </div>
          <div className="mt-4">
            <div className="relative grid grid-cols-2 rounded-lg border border-white/15 bg-mn-leaf/60 p-1">
              <span
                className={`pointer-events-none absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-md bg-mn-lime/20 shadow-[0_0_16px_rgba(196,255,77,0.22)] transition-transform duration-300 ${
                  authMode === "login" ? "translate-x-0" : "translate-x-full"
                }`}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className={`relative z-10 rounded-md px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98] ${
                  authMode === "login" ? "text-mn-mist" : "text-mn-fog"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("register")}
                className={`relative z-10 rounded-md px-3 py-2 text-sm font-semibold transition-colors active:scale-[0.98] ${
                  authMode === "register" ? "text-mn-mist" : "text-mn-fog"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>
          <div
            className={`mt-4 rounded-xl border border-white/10 p-4 transition-all duration-300 ${
              authMode === "login"
                ? "bg-[linear-gradient(180deg,rgba(22,34,28,0.9),rgba(17,26,21,0.75))]"
                : "bg-[linear-gradient(180deg,rgba(28,39,32,0.9),rgba(17,26,21,0.75))]"
            } ${authSuccessFlash ? "scale-[1.01] shadow-[0_0_30px_rgba(196,255,77,0.2)]" : ""}`}
          >
            <p className="mb-3 text-xs text-mn-fog">
              {authMode === "login"
                ? "Welcome back. Use your linked account username to continue."
                : "Create a linked account username. You can use any name you want."}
            </p>
            <div className="grid gap-3">
              <input
                value={authUsername}
                onChange={(event) => setAuthUsername(event.target.value)}
                className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="Linked Account Username"
              />
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="Password"
              />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAuth}
                disabled={authLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime shadow-[0_0_16px_rgba(196,255,77,0.18)] transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
              >
                {authLoading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                ) : null}
                {authMode === "login" ? "Login to Clan War Event" : "Create Account"}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                disabled={authLoading}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist active:scale-[0.98] disabled:opacity-60"
              >
                {authMode === "login" ? "Need an account?" : "Already have an account?"}
              </button>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full bg-mn-lime/70 transition-all duration-500 ${
                  authLoading ? "w-full animate-pulse" : authSuccessFlash ? "w-full" : "w-0"
                }`}
              />
            </div>
          </div>
          {errorMessage ? (
            <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}
        </div>

      </div>
    );
  }

  if (myClanQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6 text-mn-fog">
          Loading Clan War Event data...
        </div>
      </div>
    );
  }

  if (myClanQuery.error?.message?.includes("No active Clash event is configured")) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="mb-6 rounded-xl border border-mn-lime/40 bg-[linear-gradient(120deg,rgba(196,255,77,0.15),rgba(102,255,220,0.12))] p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan War Event</h1>
          <p className="mt-2 text-sm text-mn-fog">
            Ready to register your team? Start the clan setup flow.
          </p>
          <Link
            to="/clans/create"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-5 py-3 text-base font-bold text-mn-lime shadow-[0_0_22px_rgba(196,255,77,0.22)] transition-all hover:bg-mn-lime/20 active:scale-[0.98]"
          >
            {createButtonLabel}
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clash Clan Manager</h1>
          <p className="mt-3 text-mn-fog">
            There is currently no active Clan War Event configured by staff.
          </p>
          <p className="mt-2 text-sm text-mn-dim">
            If you are a leader, please check back later or contact an admin.
          </p>
        </div>

      </div>
    );
  }

  const payload = myClanQuery.data;
  const canEdit = !!payload && payload.isLeader && !(payload.event.isLocked && !authQuery.data?.isAdmin);

  return (
    <div className="mx-auto max-w-5xl px-4 py-24">
      <div className="mb-6 rounded-xl border border-mn-lime/40 bg-[linear-gradient(120deg,rgba(196,255,77,0.15),rgba(102,255,220,0.12))] p-6">
        <h1 className="text-2xl font-bold text-mn-mist">Clan War Event</h1>
        <p className="mt-2 text-sm text-mn-fog">
          Manage your clan settings and roster here.
        </p>
        <Link
          to="/clans/create"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-5 py-3 text-base font-bold text-mn-lime shadow-[0_0_22px_rgba(196,255,77,0.22)] transition-all hover:bg-mn-lime/20 active:scale-[0.98]"
        >
          {createButtonLabel}
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h1 className="text-2xl font-bold text-mn-mist">Clash Clan Manager</h1>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-mn-fog">
            Logged in as <span className="text-mn-mist">{authQuery.data?.minecraftUsername ?? "Unknown"}</span>
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-mn-fog transition-colors hover:text-mn-mist active:scale-[0.98]"
          >
            Logout
          </button>
        </div>
        <p className="mt-2 text-sm text-mn-fog">
          Event: <span className="text-mn-mist">{payload?.event.name ?? "Loading..."}</span>
        </p>
        {payload?.event.lockAt ? (
          <p className="mt-1 text-sm text-mn-fog">
            Deadline: {new Date(payload.event.lockAt).toLocaleString()}
          </p>
        ) : null}
        {payload?.event.isLocked ? (
          <p className="mt-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Clan edits are locked for players after the deadline.
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {!payload?.clan ? (
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h2 className="text-lg font-semibold text-mn-mist">No Clan Created Yet</h2>
          <p className="mt-2 text-sm text-mn-fog">
            Create your clan in the dedicated setup page with leader, members, color, trim, and material.
          </p>
          <div className="mt-4">
            <Link
              to="/clans/create"
              className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime shadow-[0_0_16px_rgba(196,255,77,0.18)] transition-all hover:bg-mn-lime/20 active:scale-[0.98]"
            >
              Create a Clan
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
            <h2 className="text-lg font-semibold text-mn-mist">{payload.clan.name}</h2>
            <p className="mt-1 text-sm text-mn-fog">
              Members: {payload.clan.members.length}/{payload.event.maxMembersPerClan}
            </p>
            <div className="mt-4">
              <div className="mb-4 grid gap-2">
                <label className="text-xs text-mn-fog">Clan Name</label>
                <input
                  value={clanName}
                  onChange={(event) => setClanName(event.target.value)}
                  className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                  placeholder="Clan Name"
                  maxLength={CLAN_NAME_MAX_LENGTH}
                  disabled={!canEdit}
                />
                {clanNameValidationError ? (
                  <p className="text-xs text-amber-200">{clanNameValidationError}</p>
                ) : (
                  <p className="text-xs text-mn-fog">Use only letters, numbers, and spaces. Max 14 characters.</p>
                )}
              </div>
              <ClanSettingsForm
                trims={trims}
                materials={materials}
                colors={colors}
                trim={trim}
                material={material}
                color={color}
                onTrimChange={(value) => setTrim(value as ClashTrim)}
                onMaterialChange={(value) => setMaterial(value as ClashMaterial)}
                onColorChange={(value) => setColor(value as ClashColor)}
                onSubmit={() =>
                  updateSettingsMutation.mutate({
                    name: cleanClanName,
                    trim,
                    material,
                    color,
                    discordServerLink,
                  })
                }
                submitLabel="Save Clan Settings"
                disabled={!canEdit || updateSettingsMutation.isPending || !!clanNameValidationError}
              />
              <div className="mt-3 grid gap-2">
                <label className="text-xs text-mn-fog">
                  Discord Server Invite (required for review)
                </label>
                <input
                  value={discordServerLink}
                  onChange={(event) => setDiscordServerLink(event.target.value)}
                  className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                  placeholder="https://discord.gg/your-server"
                  disabled={!canEdit}
                />
              </div>
            </div>
            {payload.clan.reviewStatus === "PENDING" ? (
              <div className="mt-3 rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300" />
                  <p className="font-semibold">Submission Received - Under Admin Review</p>
                </div>
                <p className="mt-2 text-amber-100">
                  Your clan is not approved yet. Admins will check your roster and Discord invite before adding you to
                  the event list.
                </p>
                <p className="mt-1 text-amber-100">
                  You can still edit members, colors, and settings while you wait. Any changes stay pending until an
                  admin approves, and only approved rosters sync in-game.
                </p>
              </div>
            ) : null}
            {payload.clan.reviewStatus === "DECLINED" ? (
              <div className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-3 text-sm text-red-200">
                <p className="font-semibold">Clan request declined</p>
                <p className="mt-1 text-red-100">
                  Reason: {payload.clan.reviewDeclineReason ?? "No reason provided."}
                </p>
                <button
                  type="button"
                  onClick={() => submitForReviewMutation.mutate()}
                  disabled={!canEdit || submitForReviewMutation.isPending}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border border-mn-lime/40 bg-mn-lime/15 px-3 py-2 text-xs font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
                >
                  {submitForReviewMutation.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                  ) : null}
                  Resubmit for Review
                </button>
              </div>
            ) : null}
            {payload.clan.reviewStatus === "APPROVED" ? (
              <p className="mt-3 rounded-md border border-mn-lime/40 bg-mn-lime/10 px-3 py-2 text-sm text-mn-lime">
                Your clan is approved for the event. If you make edits, it will return to pending review until admins
                approve again.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
            <h3 className="text-lg font-semibold text-mn-mist">Roster</h3>
            <div className="mt-4 flex gap-3">
              <input
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                className="flex-1 rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="Minecraft Name"
                disabled={!canEdit}
              />
              <button
                type="button"
                disabled={!canEdit || addMemberMutation.isPending}
                onClick={() =>
                  addMemberMutation.mutate({
                    minecraftName: memberName,
                  })
                }
                className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
              >
                {addMemberMutation.isPending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                ) : null}
                Add Member
              </button>
            </div>
            <div className="mt-4">
              <ClanRosterTable
                members={payload.clan.members}
                canEdit={canEdit}
                onRemove={(memberId) => removeMemberMutation.mutate({ memberId })}
                onPromote={(memberId) => setLeaderMutation.mutate({ memberId })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
