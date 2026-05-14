import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

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

const MINECRAFT_NAME_REGEX = /^[A-Za-z0-9_]{3,16}$/;
const CLAN_NAME_REGEX = /^[A-Za-z0-9 ]+$/;
const CLAN_NAME_MAX_LENGTH = 14;
const DISCORD_INVITE_REGEX = /^https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,}$/i;
const STEP_TITLES = ["Clan Basics", "Style", "Discord", "Members", "Review"] as const;
const MINECRAFT_COLOR_HEX: Record<ClashColor, string> = {
  BLACK: "#000000",
  DARK_BLUE: "#0000AA",
  DARK_GREEN: "#00AA00",
  DARK_AQUA: "#00AAAA",
  DARK_RED: "#AA0000",
  DARK_PURPLE: "#AA00AA",
  GOLD: "#FFAA00",
  GRAY: "#AAAAAA",
  DARK_GRAY: "#555555",
  BLUE: "#5555FF",
  GREEN: "#55FF55",
  AQUA: "#55FFFF",
  RED: "#FF5555",
  LIGHT_PURPLE: "#FF55FF",
  YELLOW: "#FFFF55",
  WHITE: "#FFFFFF",
};
const FIREWORK_ACCENTS = ["#FF5555", "#55FFFF", "#55FF55", "#FFAA00", "#FF55FF", "#FFFF55"] as const;

export default function ClanCreatePage() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const meQuery = trpc.clan.me.useQuery(undefined, { retry: false });
  const myClanQuery = trpc.clan.myClan.useQuery(undefined, {
    enabled: meQuery.isSuccess,
  });
  const optionsQuery = trpc.clan.options.useQuery();

  const [clanName, setClanName] = useState("");
  const [kingUsername, setKingUsername] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [memberDraft, setMemberDraft] = useState("");
  const [rosterNotice, setRosterNotice] = useState("");
  const [trim, setTrim] = useState<ClashTrim>("SENTRY");
  const [material, setMaterial] = useState<ClashMaterial>("IRON");
  const [color, setColor] = useState<ClashColor>("WHITE");
  const [discordServerLink, setDiscordServerLink] = useState("");
  const [step, setStep] = useState(0);
  const [submitCelebration, setSubmitCelebration] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessFlash, setAuthSuccessFlash] = useState(false);

  const createMutation = trpc.clan.createMyClan.useMutation({
    onSuccess: async () => {
      setSubmitCelebration(true);
      await utils.clan.myClan.invalidate();
      window.setTimeout(() => {
        navigate("/clans/manage");
      }, 1900);
    },
  });

  const cleanClanName = clanName.trim();
  const cleanKing = kingUsername.trim();
  const isClanNameValid =
    cleanClanName.length >= 2 && cleanClanName.length <= CLAN_NAME_MAX_LENGTH && CLAN_NAME_REGEX.test(cleanClanName);
  const canContinueBasics = isClanNameValid && MINECRAFT_NAME_REGEX.test(cleanKing);
  const canContinueStyle = !optionsQuery.isLoading && !optionsQuery.error;
  const canContinueDiscord = DISCORD_INVITE_REGEX.test(discordServerLink.trim());
  const maxTotalMembers = myClanQuery.data?.event.maxMembersPerClan ?? 10;
  const minTotalMembers = myClanQuery.data?.event.minMembersPerClan ?? 8;
  const maxAdditionalMembers = Math.max(maxTotalMembers - 1, 0);
  const totalMembers = members.length + 1;
  const meetsMinimumRoster = totalMembers >= minTotalMembers;
  const withinMaximumRoster = totalMembers <= maxTotalMembers;
  const canCreateClan = canContinueBasics && canContinueStyle && meetsMinimumRoster && withinMaximumRoster;
  const progressPercent = ((step + 1) / STEP_TITLES.length) * 100;

  const errorMessage = useMemo(
    () => authError || createMutation.error?.message || myClanQuery.error?.message,
    [authError, createMutation.error?.message, myClanQuery.error?.message],
  );

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
      await meQuery.refetch();
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

  const addMember = () => {
    const candidate = memberDraft.trim();
    if (!candidate) return;
    if (!MINECRAFT_NAME_REGEX.test(candidate)) {
      setRosterNotice("Member usernames must be valid Minecraft names (3-16, letters/numbers/_).");
      return;
    }
    if (candidate.toLowerCase() === cleanKing.toLowerCase()) {
      setRosterNotice("Leader username is already included separately.");
      return;
    }
    if (members.some((name) => name.toLowerCase() === candidate.toLowerCase())) {
      setRosterNotice("That member is already in the list.");
      return;
    }
    if (members.length >= maxAdditionalMembers) {
      setRosterNotice(`You can add up to ${maxAdditionalMembers} members (max ${maxTotalMembers} total with leader).`);
      return;
    }
    setMembers((prev) => [...prev, candidate]);
    setMemberDraft("");
    setRosterNotice("");
  };

  const removeMember = (name: string) => {
    setMembers((prev) => prev.filter((member) => member !== name));
    setRosterNotice("");
  };

  if (meQuery.isLoading || myClanQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-mn-fog">
        Loading clan setup...
      </div>
    );
  }

  if (meQuery.error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Create a Clan</h1>
          <p className="mt-3 text-mn-fog">Login or create an account to begin clan setup.</p>
          <div className="mt-3 rounded-lg border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Only clan leaders should create accounts.
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
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
              >
                {authLoading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                ) : null}
                {authMode === "login" ? "Login to Continue" : "Create Account"}
              </button>
              <Link
                to="/clans"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist"
              >
                Back to Clans
              </Link>
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

  if (myClanQuery.data?.clan) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Create a Clan</h1>
          <p className="mt-3 text-mn-fog">You already have a clan for this event.</p>
          <Link
            to="/clans/manage"
            className="mt-4 inline-flex rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime"
          >
            Go to My Clan
          </Link>
        </div>
      </div>
    );
  }

  const trims = optionsQuery.data?.trims ?? [];
  const materials = optionsQuery.data?.materials ?? [];
  const colors = optionsQuery.data?.colors ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-24">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-mn-moss/70 p-6 md:p-7">
        {submitCelebration ? (
          <div className="pointer-events-none absolute inset-0 z-20">
            <div className="absolute inset-0 bg-mn-leaf/30 backdrop-blur-[1px]" />
            <div className="absolute left-1/2 top-8 -translate-x-1/2 rounded-md border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime shadow-[0_0_25px_rgba(196,255,77,0.35)]">
              Submitted for review! Redirecting...
            </div>
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={`firework-${index}`}
                className="absolute h-2.5 w-2.5 animate-ping rounded-full"
                style={{
                  top: `${12 + (index % 6) * 13}%`,
                  left: `${8 + ((index * 17) % 84)}%`,
                  backgroundColor: FIREWORK_ACCENTS[index % FIREWORK_ACCENTS.length],
                  animationDuration: `${650 + (index % 4) * 180}ms`,
                  animationDelay: `${(index % 5) * 90}ms`,
                }}
              />
            ))}
          </div>
        ) : null}
        <h1 className="text-2xl font-bold text-mn-mist">Create a Clan</h1>
        <p className="mt-2 text-sm text-mn-fog">Quick setup wizard - 5 short steps.</p>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-mn-fog">
            <span>
              Step {step + 1} of {STEP_TITLES.length}
            </span>
            <span>{STEP_TITLES[step]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-mn-lime transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
            {STEP_TITLES.map((title, index) => {
              const isCurrent = index === step;
              const isComplete = index < step;
              return (
                <button
                  key={title}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`rounded-md border px-2.5 py-2 text-xs transition-colors ${
                    isCurrent
                      ? "border-mn-lime/60 bg-mn-lime/15 text-mn-lime"
                      : isComplete
                        ? "border-white/20 bg-white/5 text-mn-mist"
                        : "border-white/10 bg-transparent text-mn-fog/70"
                  }`}
                >
                  {title}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 rounded-lg border border-white/10 bg-black/10 p-4">
          {step === 0 ? (
            <div className="grid gap-3">
              <p className="text-sm text-mn-fog">Start with your clan identity.</p>
              <input
                value={clanName}
                onChange={(event) => setClanName(event.target.value)}
                className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="Clan Name"
                maxLength={CLAN_NAME_MAX_LENGTH}
              />
              <input
                value={kingUsername}
                onChange={(event) => setKingUsername(event.target.value)}
                className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="Leader Username"
              />
              {!canContinueBasics ? (
                <p className="text-xs text-mn-fog/80">
                  Clan names must be 2-14 characters, letters/numbers/spaces only, and leader username must be valid.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3">
              <p className="text-sm text-mn-fog">Pick your clan style. These choices affect how your clan looks in-game.</p>
              {optionsQuery.isLoading ? (
                <p className="text-sm text-mn-fog">Loading style options...</p>
              ) : (
                <div className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1 text-xs text-mn-fog">
                      Armor Trim Pattern
                      <span className="text-[11px] text-mn-fog/80">
                        This is the trim pattern style used for your clan's armor look.
                      </span>
                      <select
                        value={trim}
                        onChange={(event) => setTrim(event.target.value as ClashTrim)}
                        className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                      >
                        {trims.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs text-mn-fog">
                      Trim Material
                      <span className="text-[11px] text-mn-fog/80">
                        This is the material color applied to your armor trim pattern.
                      </span>
                      <select
                        value={material}
                        onChange={(event) => setMaterial(event.target.value as ClashMaterial)}
                        className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                      >
                        {materials.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-mn-fog">Clan Prefix / Name Color (Minecraft chat color)</p>
                    <p className="mt-1 text-[11px] text-mn-fog/80">
                      This color is used for your clan prefix and clan-related name color styling.
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                      {colors.map((item) => {
                        const colorKey = item as ClashColor;
                        const hex = MINECRAFT_COLOR_HEX[colorKey] ?? "#FFFFFF";
                        const isSelected = color === colorKey;
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setColor(colorKey)}
                            className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-all ${
                              isSelected
                                ? "border-mn-lime/60 bg-mn-lime/10"
                                : "border-white/15 bg-black/20 hover:bg-white/5"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-sm border border-white/20"
                              style={{ backgroundColor: hex }}
                              aria-hidden
                            />
                            <span style={{ color: hex }}>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm">
                      <span className="text-mn-fog">Preview: </span>
                      <span style={{ color: MINECRAFT_COLOR_HEX[color] }}>[{cleanClanName || "CLAN"}]</span>
                      <span className="text-mn-fog"> </span>
                      <span style={{ color: MINECRAFT_COLOR_HEX[color] }}>{cleanKing || "LeaderName"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3">
              <p className="text-sm text-mn-fog">
                Enter your clan Discord server invite. This is required for review communication.
              </p>
              <input
                value={discordServerLink}
                onChange={(event) => setDiscordServerLink(event.target.value)}
                className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                placeholder="https://discord.gg/your-server"
              />
              <p className="text-xs text-mn-fog/80">
                Your clan will be submitted for admin review after setup. It is not auto-approved.
              </p>
              {!canContinueDiscord ? (
                <p className="text-xs text-amber-200">Please enter a valid Discord invite link.</p>
              ) : (
                <p className="text-xs text-mn-lime">Discord link looks good.</p>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-mn-fog">
                  Add members one by one (up to {maxAdditionalMembers}). Clan size must be {minTotalMembers} minimum and{" "}
                  {maxTotalMembers} maximum (including leader).
                </p>
                <span className="rounded-md border border-white/15 px-2 py-1 text-xs text-mn-mist">
                  {members.length}/{maxAdditionalMembers}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={memberDraft}
                  onChange={(event) => setMemberDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addMember();
                    }
                  }}
                  className="flex-1 rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
                  placeholder="Member Username"
                />
                <button
                  type="button"
                  onClick={addMember}
                  className="rounded-md border border-mn-lime/50 bg-mn-lime/15 px-3 py-2 text-sm font-semibold text-mn-lime transition-colors hover:bg-mn-lime/20"
                >
                  Add Member
                </button>
              </div>
              {rosterNotice ? <p className="text-xs text-amber-200">{rosterNotice}</p> : null}
              {members.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <button
                      key={member}
                      type="button"
                      onClick={() => removeMember(member)}
                      className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-mn-mist transition-colors hover:bg-red-500/10 hover:text-red-200"
                      title="Remove member"
                    >
                      {member} x
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-mn-fog/80">No members added yet.</p>
              )}
              {!meetsMinimumRoster ? (
                <p className="text-xs text-amber-200">
                  You currently have {totalMembers}/{maxTotalMembers} total players (including leader). Minimum required is{" "}
                  {minTotalMembers}.
                </p>
              ) : (
                <p className="text-xs text-mn-lime">
                  Roster valid so far: {totalMembers}/{maxTotalMembers} total players (minimum {minTotalMembers}).
                </p>
              )}
            </div>
          ) : null}

          {step === 4 ? (
            <div className="grid gap-3">
              <p className="text-sm text-mn-fog">Review before submitting your clan for approval.</p>
              <div className="grid gap-2 rounded-md border border-white/10 bg-white/5 p-3 text-sm text-mn-mist">
                <p>
                  <span className="text-mn-fog">Clan:</span> {cleanClanName || "-"}
                </p>
                <p>
                  <span className="text-mn-fog">Leader:</span> {cleanKing || "-"}
                </p>
                <p>
                  <span className="text-mn-fog">Style:</span> {trim} / {material} / {color}
                </p>
                <p>
                  <span className="text-mn-fog">Discord Server:</span> {discordServerLink.trim() || "-"}
                </p>
                <p>
                  <span className="text-mn-fog">Members:</span> {members.length}
                </p>
                <p>
                  <span className="text-mn-fog">Total players (with leader):</span> {totalMembers}/{maxTotalMembers}
                </p>
              </div>
              {!meetsMinimumRoster ? (
                <p className="text-xs text-amber-200">
                  Clan creation requires at least {minTotalMembers} total players (leader + members).
                </p>
              ) : null}
              {!withinMaximumRoster ? (
                <p className="text-xs text-red-200">
                  Clan exceeds the maximum of {maxTotalMembers} total players.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/clans"
            className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist"
          >
            Cancel
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist"
              >
                Back
              </button>
            ) : null}

            {step < STEP_TITLES.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1))}
                disabled={
                  (step === 0 && !canContinueBasics) ||
                  (step === 1 && !canContinueStyle) ||
                  (step === 2 && !canContinueDiscord) ||
                  submitCelebration
                }
                className="inline-flex items-center justify-center rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  createMutation.mutate({
                    name: cleanClanName,
                    kingUsername: cleanKing,
                    memberUsernames: members,
                    discordServerLink: discordServerLink.trim(),
                    trim,
                    material,
                    color,
                  })
                }
                disabled={createMutation.isPending || !canCreateClan || submitCelebration}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
              >
                {createMutation.isPending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-mn-lime/40 border-t-mn-lime" />
                ) : null}
                Submit for Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
