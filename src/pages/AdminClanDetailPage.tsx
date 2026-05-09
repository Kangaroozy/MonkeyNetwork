import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import ClanRosterTable from "@/components/clan/ClanRosterTable";
import ClanSettingsForm from "@/components/clan/ClanSettingsForm";

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

export default function AdminClanDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const meQuery = trpc.clan.me.useQuery(undefined, { retry: false });
  const optionsQuery = trpc.clan.options.useQuery();
  const clansQuery = trpc.clan.adminListClans.useQuery(undefined, {
    enabled: meQuery.data?.isAdmin === true,
  });

  const clanId = Number(params.clanId ?? 0);
  const clan = clansQuery.data?.clans.find((item) => item.id === clanId);

  const [memberName, setMemberName] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [moveTargetClanId, setMoveTargetClanId] = useState<number | null>(null);
  const [trim, setTrim] = useState<ClashTrim>("SENTRY");
  const [material, setMaterial] = useState<ClashMaterial>("IRON");
  const [color, setColor] = useState<ClashColor>("WHITE");
  const [discordServerLink, setDiscordServerLink] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [uiNotice, setUiNotice] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const deleteClanMutation = trpc.clan.adminDeleteClan.useMutation({
    onSuccess: () => {
      setIsDeleteModalOpen(false);
      setDeleteConfirmInput("");
      void utils.clan.adminListClans.invalidate();
      navigate("/admin/clans", { replace: true });
    },
  });
  const addMemberMutation = trpc.clan.adminAddMember.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
      setMemberName("");
      setUiNotice("Member added.");
    },
  });
  const removeMemberMutation = trpc.clan.adminRemoveMember.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
      setUiNotice("Member removed.");
    },
  });
  const setLeaderMutation = trpc.clan.adminSetLeader.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
      setUiNotice("Clan leader updated.");
    },
  });
  const updateClanSettingsMutation = trpc.clan.adminUpdateClanSettings.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
      setUiNotice("Clan settings saved.");
    },
  });
  const moveMemberMutation = trpc.clan.adminMoveMember.useMutation({
    onSuccess: async () => {
      await clansQuery.refetch();
      setUiNotice("Member moved.");
    },
  });
  const reviewClanMutation = trpc.clan.adminReviewClan.useMutation({
    onSuccess: async (_, variables) => {
      await clansQuery.refetch();
      setUiNotice(variables.status === "APPROVED" ? "Clan approved." : "Clan declined.");
    },
  });

  useEffect(() => {
    if (!clan) return;
    setTrim(clan.trim as ClashTrim);
    setMaterial(clan.material as ClashMaterial);
    setColor(clan.color as ClashColor);
    setDiscordServerLink(clan.discordServerLink ?? "");
    setDeclineReason(clan.reviewDeclineReason ?? "");
  }, [clan]);

  useEffect(() => {
    if (!uiNotice) return;
    const timer = window.setTimeout(() => setUiNotice(""), 1800);
    return () => window.clearTimeout(timer);
  }, [uiNotice]);

  const errorMessage = useMemo(
    () =>
      meQuery.error?.message ??
      clansQuery.error?.message ??
      deleteClanMutation.error?.message ??
      addMemberMutation.error?.message ??
      removeMemberMutation.error?.message ??
      setLeaderMutation.error?.message ??
      updateClanSettingsMutation.error?.message ??
      moveMemberMutation.error?.message ??
      reviewClanMutation.error?.message,
    [
      addMemberMutation.error?.message,
      clansQuery.error?.message,
      deleteClanMutation.error?.message,
      meQuery.error?.message,
      moveMemberMutation.error?.message,
      removeMemberMutation.error?.message,
      reviewClanMutation.error?.message,
      setLeaderMutation.error?.message,
      updateClanSettingsMutation.error?.message,
    ],
  );

  if (meQuery.isLoading || clansQuery.isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-mn-fog">Loading clan admin view...</div>;
  }

  if (meQuery.error || !meQuery.data?.isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan Admin</h1>
          <p className="mt-3 text-mn-fog">Admin role required.</p>
        </div>
      </div>
    );
  }

  if (!clan) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="rounded-xl border border-white/10 bg-mn-moss/70 p-6">
          <h1 className="text-2xl font-bold text-mn-mist">Clan Not Found</h1>
          <p className="mt-3 text-mn-fog">That clan does not exist for the active event.</p>
          <Link
            to="/admin/clans"
            className="mt-4 inline-flex rounded-lg border border-mn-lime/50 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime"
          >
            Back to Clan Admin
          </Link>
        </div>
      </div>
    );
  }

  const trims = optionsQuery.data?.trims ?? [];
  const materials = optionsQuery.data?.materials ?? [];
  const colors = optionsQuery.data?.colors ?? [];
  const canConfirmDelete = deleteConfirmInput.trim().toUpperCase() === "DELETE CLAN";

  return (
    <div className="mx-auto max-w-6xl px-4 py-24">
      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-mn-mist">{clan.name}</h1>
            <p className="mt-1 text-sm text-mn-fog">
              {clan.memberCount}/{clansQuery.data?.event.maxMembersPerClan ?? 0} members
            </p>
            <p className="mt-1 text-sm text-mn-fog">
              Trim {clan.trim} · Material {clan.material} · Color {clan.color}
            </p>
            <p className="mt-1 text-sm text-mn-fog">Status: {clan.reviewStatus}</p>
          </div>
          <Link
            to="/admin/clans"
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-mn-fog transition-colors hover:text-mn-mist"
          >
            Back to Clans
          </Link>
        </div>
        {uiNotice ? (
          <p className="mt-3 rounded-md border border-mn-lime/40 bg-mn-lime/10 px-3 py-2 text-sm text-mn-lime">
            {uiNotice}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Review Decision</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reviewClanMutation.mutate({ clanId: clan.id, status: "APPROVED" })}
            disabled={reviewClanMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md border border-mn-lime/40 bg-mn-lime/15 px-3 py-2 text-xs font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
          >
            Approve Clan
          </button>
          <input
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            className="min-w-[260px] flex-1 rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            placeholder="Decline reason (required)"
          />
          <button
            type="button"
            onClick={() =>
              reviewClanMutation.mutate({
                clanId: clan.id,
                status: "DECLINED",
                reason: declineReason.trim(),
              })
            }
            disabled={reviewClanMutation.isPending || !declineReason.trim()}
            className="inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 active:scale-[0.98] disabled:opacity-60"
          >
            Decline Clan
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Edit Clan Settings</h2>
        <div className="mt-3">
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
              updateClanSettingsMutation.mutate({
                clanId: clan.id,
                trim,
                material,
                color,
                discordServerLink,
              })
            }
            submitLabel="Save Settings"
            disabled={updateClanSettingsMutation.isPending}
          />
          <div className="mt-3 grid gap-1">
            <label className="text-xs text-mn-fog">Discord Server Invite</label>
            <input
              value={discordServerLink}
              onChange={(event) => setDiscordServerLink(event.target.value)}
              className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
              placeholder="https://discord.gg/your-server"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-white/10 bg-mn-moss/70 p-6">
        <h2 className="text-lg font-semibold text-mn-mist">Roster Management</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input
            value={memberName}
            onChange={(event) => setMemberName(event.target.value)}
            className="flex-1 rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            placeholder="Add member minecraft name"
          />
          <button
            type="button"
            onClick={() => addMemberMutation.mutate({ clanId: clan.id, minecraftName: memberName })}
            disabled={addMemberMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
          >
            Add Member
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-mn-leaf/40 p-4">
          <h4 className="text-sm font-semibold text-mn-mist">Move Member To Another Clan</h4>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <select
              value={selectedMemberId ?? ""}
              onChange={(event) => setSelectedMemberId(Number(event.target.value))}
              className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            >
              <option value="">Select member</option>
              {clan.members
                .filter((member) => member.isLeader !== 1)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.minecraftName}
                  </option>
                ))}
            </select>
            <select
              value={moveTargetClanId ?? ""}
              onChange={(event) => setMoveTargetClanId(Number(event.target.value))}
              className="rounded-md border border-white/15 bg-mn-leaf px-3 py-2 text-sm text-mn-mist"
            >
              <option value="">Select target clan</option>
              {clansQuery.data?.clans
                .filter((otherClan) => otherClan.id !== clan.id)
                .map((otherClan) => (
                  <option key={otherClan.id} value={otherClan.id}>
                    {otherClan.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={moveMemberMutation.isPending}
              onClick={() => {
                if (!selectedMemberId || !moveTargetClanId) return;
                moveMemberMutation.mutate({ memberId: selectedMemberId, targetClanId: moveTargetClanId });
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-mn-lime/40 bg-mn-lime/15 px-4 py-2 text-sm font-semibold text-mn-lime transition-all hover:bg-mn-lime/20 active:scale-[0.98] disabled:opacity-60"
            >
              Move Member
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ClanRosterTable
            members={clan.members}
            canEdit
            onRemove={(memberId) => removeMemberMutation.mutate({ memberId })}
            onPromote={(memberId) => setLeaderMutation.mutate({ clanId: clan.id, memberId })}
          />
        </div>
      </div>

      <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-6">
        <h2 className="text-lg font-semibold text-red-200">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-100">Delete this clan and remove it from the event.</p>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          disabled={deleteClanMutation.isPending}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 active:scale-[0.98] disabled:opacity-60"
        >
          {deleteClanMutation.isPending ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/40 border-t-red-300" />
          ) : null}
          Delete Clan
        </button>
      </div>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-xl border border-red-400/35 bg-mn-moss p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-red-200">Confirm Clan Deletion</h3>
            <p className="mt-2 text-sm text-red-100">
              This permanently deletes <span className="font-semibold text-red-200">{clan.name}</span> and removes it
              from the event.
            </p>
            <p className="mt-3 text-xs text-red-100/90">Type exactly: <span className="font-semibold">DELETE CLAN</span></p>
            <input
              value={deleteConfirmInput}
              onChange={(event) => setDeleteConfirmInput(event.target.value)}
              className="mt-2 w-full rounded-md border border-red-400/35 bg-black/20 px-3 py-2 text-sm text-mn-mist"
              placeholder="DELETE CLAN"
              autoFocus
            />
            {deleteClanMutation.isPending ? (
              <div className="mt-3">
                <p className="mb-1 text-xs text-red-100">Deleting clan...</p>
                <div className="h-1 overflow-hidden rounded-full bg-red-950/60">
                  <div className="h-full w-full animate-pulse rounded-full bg-red-300" />
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  if (deleteClanMutation.isPending) return;
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmInput("");
                }}
                className="rounded-md border border-white/20 px-3 py-2 text-sm font-semibold text-mn-fog transition-colors hover:text-mn-mist"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteClanMutation.mutate({ clanId: clan.id })}
                disabled={!canConfirmDelete || deleteClanMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-60"
              >
                {deleteClanMutation.isPending ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/40 border-t-red-300" />
                ) : null}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
