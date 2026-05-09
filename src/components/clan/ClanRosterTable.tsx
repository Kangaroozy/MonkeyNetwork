type ClanMember = {
  id: number;
  minecraftName: string;
  discordUsername: string | null;
  isLeader: number;
};

type ClanRosterTableProps = {
  members: ClanMember[];
  canEdit: boolean;
  onRemove?: (memberId: number) => void;
  onPromote?: (memberId: number) => void;
};

export default function ClanRosterTable({
  members,
  canEdit,
  onRemove,
  onPromote,
}: ClanRosterTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-mn-moss/70">
      <div className="border-b border-white/10 px-4 py-2 text-xs text-mn-dim sm:hidden">
        Swipe horizontally to see full roster actions.
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-mn-leaf/70">
          <tr>
            <th className="px-4 py-3 font-semibold text-mn-fog">Minecraft</th>
            <th className="px-4 py-3 font-semibold text-mn-fog">Discord</th>
            <th className="px-4 py-3 font-semibold text-mn-fog">Role</th>
            <th className="px-4 py-3 font-semibold text-mn-fog">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-t border-white/10">
              <td className="px-4 py-3 text-mn-mist">{member.minecraftName}</td>
              <td className="px-4 py-3 text-mn-fog">{member.discordUsername ?? "Not linked"}</td>
              <td className="px-4 py-3">
                {member.isLeader === 1 ? (
                  <span className="rounded-md bg-mn-lime/20 px-2 py-1 text-xs font-semibold text-mn-lime">
                    King
                  </span>
                ) : (
                  <span className="text-mn-fog">Member</span>
                )}
              </td>
              <td className="px-4 py-3">
                {canEdit ? (
                  <div className="flex gap-2">
                    {member.isLeader !== 1 && onPromote ? (
                      <button
                        type="button"
                        onClick={() => onPromote(member.id)}
                        className="rounded-md border border-mn-lime/40 px-2 py-1 text-xs text-mn-lime transition-all hover:bg-mn-lime/15 active:scale-[0.98]"
                      >
                        Set King
                      </button>
                    ) : null}
                    {member.isLeader !== 1 && onRemove ? (
                      <button
                        type="button"
                        onClick={() => onRemove(member.id)}
                        className="rounded-md border border-red-400/40 px-2 py-1 text-xs text-red-300 transition-all hover:bg-red-500/10 active:scale-[0.98]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-mn-dim">Read only</span>
                )}
              </td>
            </tr>
          ))}
          {members.length === 0 ? (
            <tr>
              <td className="px-4 py-4 text-mn-dim" colSpan={4}>
                No members yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
