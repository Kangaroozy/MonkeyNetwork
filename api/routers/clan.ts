import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  clashAccounts,
  clashClanMembers,
  clashClans,
  clashEvents,
  clashRosterAudit,
  CLASH_AUDIT_ACTION_OPTIONS,
  CLASH_COLOR_OPTIONS,
  CLASH_MATERIAL_OPTIONS,
  CLASH_MEMBER_SOURCE_OPTIONS,
  CLASH_REVIEW_STATUS_OPTIONS,
  CLASH_TRIM_OPTIONS,
} from "@db/schema";
import { adminProcedure, createRouter, protectedProcedure, publicQuery } from "../middleware";
import { getClashDb } from "../queries/clashConnection";
import { hashPassword } from "../lib/session";

const MINECRAFT_NAME_REGEX = /^[A-Za-z0-9_]{3,16}$/;
const EVENT_MIN_MEMBERS_FLOOR = 2;
const EVENT_MAX_MEMBERS_CEILING = 100;
const DISCORD_INVITE_REGEX = /^https?:\/\/(www\.)?(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]{2,}$/i;
function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

const createClanSchema = z.object({
  name: z.string().trim().min(2).max(64),
  kingUsername: z.string().trim().regex(MINECRAFT_NAME_REGEX, "Invalid leader Minecraft username."),
  memberUsernames: z.array(z.string().trim().regex(MINECRAFT_NAME_REGEX)).max(19),
  discordServerLink: z.string().trim().regex(DISCORD_INVITE_REGEX, "Enter a valid Discord invite link."),
  trim: z.enum(CLASH_TRIM_OPTIONS),
  material: z.enum(CLASH_MATERIAL_OPTIONS),
  color: z.enum(CLASH_COLOR_OPTIONS),
});

const addMemberSchema = z.object({
  minecraftName: z.string().trim().regex(MINECRAFT_NAME_REGEX, "Invalid Minecraft username."),
});

async function getActiveEvent() {
  const db = getClashDb();
  const [event] = await db
    .select()
    .from(clashEvents)
    .where(eq(clashEvents.isActive, 1))
    .orderBy(desc(clashEvents.updatedAt))
    .limit(1);
  if (!event) {
    throw new TRPCError({ code: "NOT_FOUND", message: "No active Clash event is configured." });
  }
  return event;
}

function isLocked(lockAt: Date | null): boolean {
  if (!lockAt) return false;
  return Date.now() >= lockAt.getTime();
}

function assertMutable(lockAt: Date | null, isAdmin: boolean) {
  if (isLocked(lockAt) && !isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Clan editing is locked after the event deadline.",
    });
  }
}

async function writeAudit(input: {
  eventId: number;
  clanId?: number | null;
  actorAccountId?: string | null;
  actorDisplayName?: string | null;
  action: (typeof CLASH_AUDIT_ACTION_OPTIONS)[number];
  payload: Record<string, unknown>;
}) {
  const db = getClashDb();
  await db.insert(clashRosterAudit).values({
    eventId: input.eventId,
    clanId: input.clanId ?? null,
    actorDiscordUserId: input.actorAccountId ?? null,
    actorDisplayName: input.actorDisplayName ?? null,
    action: input.action,
    payloadJson: JSON.stringify(input.payload),
  });
}

async function getClanMembers(clanId: number) {
  const db = getClashDb();
  return db
    .select()
    .from(clashClanMembers)
    .where(eq(clashClanMembers.clanId, clanId))
    .orderBy(desc(clashClanMembers.isLeader), asc(clashClanMembers.minecraftName));
}

async function requireLeaderClan(eventId: number, accountId: number) {
  const db = getClashDb();
  const [clan] = await db
    .select()
    .from(clashClans)
    .where(and(eq(clashClans.eventId, eventId), eq(clashClans.leaderDiscordUserId, String(accountId))))
    .limit(1);
  if (!clan) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a clan leader to edit this roster.",
    });
  }
  return clan;
}

async function requireClanById(clanId: number, eventId: number) {
  const db = getClashDb();
  const [clan] = await db
    .select()
    .from(clashClans)
    .where(and(eq(clashClans.id, clanId), eq(clashClans.eventId, eventId)))
    .limit(1);
  if (!clan) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Clan not found." });
  }
  return clan;
}

async function enforceClanSize(clanId: number, maxMembers: number) {
  const db = getClashDb();
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clashClanMembers)
    .where(eq(clashClanMembers.clanId, clanId));
  const count = Number(countRow?.count ?? 0);
  if (count > maxMembers) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Clan exceeds max size (${maxMembers}).`,
    });
  }
}

async function getClanWithMembers(clanId: number) {
  const db = getClashDb();
  const [clan] = await db.select().from(clashClans).where(eq(clashClans.id, clanId)).limit(1);
  if (!clan) return null;
  const members = await getClanMembers(clan.id);
  return { ...clan, members };
}

async function markClanPendingAfterPlayerEdit(clanId: number) {
  const db = getClashDb();
  const [clan] = await db.select().from(clashClans).where(eq(clashClans.id, clanId)).limit(1);
  if (!clan || clan.reviewStatus === "PENDING") return false;
  await db
    .update(clashClans)
    .set({
      reviewStatus: "PENDING",
      reviewDeclineReason: null,
      reviewedByAccountId: null,
      reviewedAt: null,
    })
    .where(eq(clashClans.id, clanId));
  return true;
}

function uniqueMinecraftNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawName of names) {
    const name = rawName.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

async function assertPlayersNotInClan(eventId: number, names: string[]) {
  const db = getClashDb();
  for (const minecraftName of names) {
    const [existingMember] = await db
      .select({ id: clashClanMembers.id })
      .from(clashClanMembers)
      .where(and(eq(clashClanMembers.eventId, eventId), eq(clashClanMembers.minecraftName, minecraftName)))
      .limit(1);
    if (existingMember) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${minecraftName} already belongs to another clan.`,
      });
    }
  }
}

export const clanRouter = createRouter({
  options: publicQuery.query(() => ({
    trims: CLASH_TRIM_OPTIONS,
    materials: CLASH_MATERIAL_OPTIONS,
    colors: CLASH_COLOR_OPTIONS,
  })),

  publicDirectory: publicQuery.query(async () => {
    const db = getClashDb();
    const event = await getActiveEvent();
    const clans = await db
      .select()
      .from(clashClans)
      .where(and(eq(clashClans.eventId, event.id), eq(clashClans.reviewStatus, "APPROVED")))
      .orderBy(asc(clashClans.name));

    const items: Array<{
      id: number;
      name: string;
      trim: (typeof CLASH_TRIM_OPTIONS)[number];
      material: (typeof CLASH_MATERIAL_OPTIONS)[number];
      color: (typeof CLASH_COLOR_OPTIONS)[number];
      king: string | null;
      members: string[];
      memberCount: number;
    }> = [];

    for (const clan of clans) {
      const members = await getClanMembers(clan.id);
      const kingMember = members.find((member) => member.isLeader === 1) ?? null;
      const nonKingMembers = members
        .filter((member) => member.isLeader !== 1)
        .map((member) => member.minecraftName);

      items.push({
        id: clan.id,
        name: clan.name,
        trim: clan.trim,
        material: clan.material,
        color: clan.color,
        king: kingMember?.minecraftName ?? null,
        members: nonKingMembers,
        memberCount: members.length,
      });
    }

    return {
      event: {
        id: event.id,
        name: event.name,
        minMembersPerClan: event.minMembersPerClan,
        maxMembersPerClan: event.maxMembersPerClan,
      },
      clans: items,
    };
  }),

  me: protectedProcedure.query(async ({ ctx }) => ({
    accountId: ctx.session.accountId,
    minecraftUsername: ctx.session.minecraftUsername,
    role: ctx.session.role,
    isAdmin: ctx.isAdmin,
  })),

  activeEvent: protectedProcedure.query(async () => {
    const event = await getActiveEvent();
    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      minMembersPerClan: event.minMembersPerClan,
      maxMembersPerClan: event.maxMembersPerClan,
      lockAt: event.lockAt,
      isLocked: isLocked(event.lockAt),
    };
  }),

  myClan: protectedProcedure.query(async ({ ctx }) => {
    const db = getClashDb();
    const event = await getActiveEvent();
    const eventSummary = {
      id: event.id,
      slug: event.slug,
      name: event.name,
      minMembersPerClan: event.minMembersPerClan,
      maxMembersPerClan: event.maxMembersPerClan,
      lockAt: event.lockAt,
      isLocked: isLocked(event.lockAt),
    };
    const [leaderClan] = await db
      .select({ id: clashClans.id })
      .from(clashClans)
      .where(and(eq(clashClans.eventId, event.id), eq(clashClans.leaderDiscordUserId, String(ctx.session.accountId))))
      .limit(1);
    if (leaderClan) {
      const clan = await getClanWithMembers(leaderClan.id);
      return {
        event: eventSummary,
        clan,
        isLeader: true,
      };
    }

    const [memberRecord] = await db
      .select()
      .from(clashClanMembers)
      .where(
        and(
          eq(clashClanMembers.eventId, event.id),
          eq(clashClanMembers.minecraftName, ctx.session.minecraftUsername),
        ),
      )
      .limit(1);
    if (!memberRecord) {
      return {
        event: eventSummary,
        clan: null,
        isLeader: false,
      };
    }
    const clan = await getClanWithMembers(memberRecord.clanId);
    if (!clan) {
      return {
        event: eventSummary,
        clan: null,
        isLeader: false,
      };
    }
    return {
      event: eventSummary,
      clan,
      isLeader: clan.leaderDiscordUserId === String(ctx.session.accountId),
    };
  }),

  createMyClan: protectedProcedure
    .input(createClanSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      assertMutable(event.lockAt, ctx.isAdmin);

      const [existingClan] = await db
        .select({ id: clashClans.id })
        .from(clashClans)
        .where(and(eq(clashClans.eventId, event.id), eq(clashClans.leaderDiscordUserId, String(ctx.session.accountId))))
        .limit(1);
      if (existingClan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already manage a clan for this event.",
        });
      }

      const [existingMember] = await db
        .select()
        .from(clashClanMembers)
        .where(
          and(
            eq(clashClanMembers.eventId, event.id),
            eq(clashClanMembers.minecraftName, ctx.session.minecraftUsername),
          ),
        )
        .limit(1);
      if (existingMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You already belong to a clan for this event.",
        });
      }

      const [existingClanName] = await db
        .select({ id: clashClans.id })
        .from(clashClans)
        .where(and(eq(clashClans.eventId, event.id), eq(clashClans.name, input.name)))
        .limit(1);
      if (existingClanName) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A clan with that name already exists." });
      }

      const [createdClan] = await db
        .insert(clashClans)
        .values({
          eventId: event.id,
          name: input.name,
          leaderDiscordUserId: String(ctx.session.accountId),
          discordServerLink: input.discordServerLink,
          reviewStatus: "PENDING",
          trim: input.trim,
          material: input.material,
          color: input.color,
        })
        .$returningId();
      const clanId = Number(createdClan.id);
      const uniqueMembers = uniqueMinecraftNames([input.kingUsername, ...input.memberUsernames]);
      if (uniqueMembers.length < event.minMembersPerClan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Clan must have at least ${event.minMembersPerClan} total members.`,
        });
      }
      if (uniqueMembers.length > event.maxMembersPerClan) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Clan exceeds max size (${event.maxMembersPerClan}).`,
        });
      }
      await assertPlayersNotInClan(event.id, uniqueMembers);
      await db.insert(clashClanMembers).values(
        uniqueMembers.map((minecraftName) => ({
          eventId: event.id,
          clanId,
          minecraftName,
          discordUserId:
            minecraftName.toLowerCase() === input.kingUsername.toLowerCase()
              ? String(ctx.session.accountId)
              : null,
          discordUsername:
            minecraftName.toLowerCase() === input.kingUsername.toLowerCase() ? ctx.session.minecraftUsername : null,
          isLeader: minecraftName.toLowerCase() === input.kingUsername.toLowerCase() ? 1 : 0,
          source: "PLAYER" as const,
        })),
      );
      await enforceClanSize(clanId, event.maxMembersPerClan);
      await writeAudit({
        eventId: event.id,
        clanId,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "CLAN_CREATED",
        payload: input,
      });
      return getClanWithMembers(clanId);
    }),

  updateMyClanSettings: protectedProcedure
    .input(
      z.object({
        trim: z.enum(CLASH_TRIM_OPTIONS),
        material: z.enum(CLASH_MATERIAL_OPTIONS),
        color: z.enum(CLASH_COLOR_OPTIONS),
        discordServerLink: z.string().trim().regex(DISCORD_INVITE_REGEX, "Enter a valid Discord invite link."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      assertMutable(event.lockAt, ctx.isAdmin);
      const clan = await requireLeaderClan(event.id, ctx.session.accountId);
      await db
        .update(clashClans)
        .set({
          trim: input.trim,
          material: input.material,
          color: input.color,
          discordServerLink: input.discordServerLink,
        })
        .where(eq(clashClans.id, clan.id));
      const reviewReset = await markClanPendingAfterPlayerEdit(clan.id);
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "CLAN_UPDATED",
        payload: { ...input, reviewResetToPending: reviewReset },
      });
      return getClanWithMembers(clan.id);
    }),

  mySubmitClanForReview: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getClashDb();
    const event = await getActiveEvent();
    assertMutable(event.lockAt, ctx.isAdmin);
    const clan = await requireLeaderClan(event.id, ctx.session.accountId);
    await db
      .update(clashClans)
      .set({
        reviewStatus: "PENDING",
        reviewDeclineReason: null,
        reviewedByAccountId: null,
        reviewedAt: null,
      })
      .where(eq(clashClans.id, clan.id));
    await writeAudit({
      eventId: event.id,
      clanId: clan.id,
      actorAccountId: String(ctx.session.accountId),
      actorDisplayName: ctx.session.minecraftUsername,
      action: "CLAN_UPDATED",
      payload: { reviewStatus: "PENDING", source: "PLAYER_RESUBMIT" },
    });
    return getClanWithMembers(clan.id);
  }),

  myAddMember: protectedProcedure.input(addMemberSchema).mutation(async ({ ctx, input }) => {
    const db = getClashDb();
    const event = await getActiveEvent();
    assertMutable(event.lockAt, ctx.isAdmin);
    const clan = await requireLeaderClan(event.id, ctx.session.accountId);

    await db.insert(clashClanMembers).values({
      eventId: event.id,
      clanId: clan.id,
      minecraftName: input.minecraftName,
      isLeader: 0,
      source: "PLAYER",
    });
    await enforceClanSize(clan.id, event.maxMembersPerClan);
    const reviewReset = await markClanPendingAfterPlayerEdit(clan.id);
    await writeAudit({
      eventId: event.id,
      clanId: clan.id,
      actorAccountId: String(ctx.session.accountId),
      actorDisplayName: ctx.session.minecraftUsername,
      action: "MEMBER_ADDED",
      payload: { ...input, reviewResetToPending: reviewReset },
    });
    return getClanWithMembers(clan.id);
  }),

  myRemoveMember: protectedProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      assertMutable(event.lockAt, ctx.isAdmin);
      const clan = await requireLeaderClan(event.id, ctx.session.accountId);
      const [member] = await db
        .select()
        .from(clashClanMembers)
        .where(and(eq(clashClanMembers.id, input.memberId), eq(clashClanMembers.clanId, clan.id)))
        .limit(1);
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in your clan." });
      }
      if (member.isLeader === 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Use leader change before removing the current leader.",
        });
      }
      await db.delete(clashClanMembers).where(eq(clashClanMembers.id, member.id));
      const reviewReset = await markClanPendingAfterPlayerEdit(clan.id);
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "MEMBER_REMOVED",
        payload: { memberId: member.id, minecraftName: member.minecraftName, reviewResetToPending: reviewReset },
      });
      return getClanWithMembers(clan.id);
    }),

  mySetLeader: protectedProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      assertMutable(event.lockAt, ctx.isAdmin);
      const clan = await requireLeaderClan(event.id, ctx.session.accountId);
      const [newLeader] = await db
        .select()
        .from(clashClanMembers)
        .where(and(eq(clashClanMembers.id, input.memberId), eq(clashClanMembers.clanId, clan.id)))
        .limit(1);
      if (!newLeader) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Selected leader is not in your clan." });
      }

      await db
        .update(clashClanMembers)
        .set({ isLeader: 0 })
        .where(eq(clashClanMembers.clanId, clan.id));
      await db
        .update(clashClanMembers)
        .set({ isLeader: 1 })
        .where(eq(clashClanMembers.id, newLeader.id));
      await db
        .update(clashClans)
        .set({ leaderDiscordUserId: newLeader.discordUserId ?? String(ctx.session.accountId) })
        .where(eq(clashClans.id, clan.id));
      const reviewReset = await markClanPendingAfterPlayerEdit(clan.id);
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "LEADER_CHANGED",
        payload: {
          memberId: newLeader.id,
          minecraftName: newLeader.minecraftName,
          reviewResetToPending: reviewReset,
        },
      });
      return getClanWithMembers(clan.id);
    }),

  adminListClans: adminProcedure.query(async () => {
    const db = getClashDb();
    const event = await getActiveEvent();
    const clans = await db
      .select()
      .from(clashClans)
      .where(eq(clashClans.eventId, event.id))
      .orderBy(asc(clashClans.name));

    const results: Array<{
      id: number;
      name: string;
      trim: (typeof CLASH_TRIM_OPTIONS)[number];
      material: (typeof CLASH_MATERIAL_OPTIONS)[number];
      color: (typeof CLASH_COLOR_OPTIONS)[number];
      discordServerLink: string | null;
      reviewStatus: (typeof CLASH_REVIEW_STATUS_OPTIONS)[number];
      reviewDeclineReason: string | null;
      reviewedByAccountId: string | null;
      reviewedAt: Date | null;
      leaderDiscordUserId: string | null;
      memberCount: number;
      members: Awaited<ReturnType<typeof getClanMembers>>;
    }> = [];

    for (const clan of clans) {
      const members = await getClanMembers(clan.id);
      results.push({
        ...clan,
        memberCount: members.length,
        members,
      });
    }
    return {
      event,
      clans: results,
      isLocked: isLocked(event.lockAt),
    };
  }),

  adminSetLockAt: adminProcedure
    .input(z.object({ lockAtIso: z.string().datetime().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const lockAt = input.lockAtIso ? new Date(input.lockAtIso) : null;
      await db
        .update(clashEvents)
        .set({ lockAt })
        .where(eq(clashEvents.id, event.id));
      await writeAudit({
        eventId: event.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "LOCK_UPDATED",
        payload: { lockAtIso: input.lockAtIso },
      });
      return {
        ok: true,
        lockAt,
      };
    }),

  adminSetMemberLimits: adminProcedure
    .input(
      z
        .object({
          minMembersPerClan: z.number().int().min(EVENT_MIN_MEMBERS_FLOOR).max(EVENT_MAX_MEMBERS_CEILING),
          maxMembersPerClan: z.number().int().min(EVENT_MIN_MEMBERS_FLOOR).max(EVENT_MAX_MEMBERS_CEILING),
        })
        .superRefine((value, refinementCtx) => {
          if (value.minMembersPerClan > value.maxMembersPerClan) {
            refinementCtx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Minimum members cannot be greater than maximum members.",
              path: ["minMembersPerClan"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      await db
        .update(clashEvents)
        .set({
          minMembersPerClan: input.minMembersPerClan,
          maxMembersPerClan: input.maxMembersPerClan,
        })
        .where(eq(clashEvents.id, event.id));
      await writeAudit({
        eventId: event.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "LOCK_UPDATED",
        payload: {
          minMembersPerClan: input.minMembersPerClan,
          maxMembersPerClan: input.maxMembersPerClan,
        },
      });
      return {
        ok: true,
        minMembersPerClan: input.minMembersPerClan,
        maxMembersPerClan: input.maxMembersPerClan,
      };
    }),

  adminCreateClan: adminProcedure.input(createClanSchema).mutation(async ({ ctx, input }) => {
    const db = getClashDb();
    const event = await getActiveEvent();
    const [createdClan] = await db
      .insert(clashClans)
      .values({
        eventId: event.id,
        name: input.name,
        leaderDiscordUserId: String(ctx.session.accountId),
        discordServerLink: input.discordServerLink,
        reviewStatus: "APPROVED",
        trim: input.trim,
        material: input.material,
        color: input.color,
      })
      .$returningId();
    const clanId = Number(createdClan.id);
    const uniqueMembers = uniqueMinecraftNames([input.kingUsername, ...input.memberUsernames]);
    if (uniqueMembers.length < event.minMembersPerClan) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Clan must have at least ${event.minMembersPerClan} total members.`,
      });
    }
    if (uniqueMembers.length > event.maxMembersPerClan) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Clan exceeds max size (${event.maxMembersPerClan}).`,
      });
    }
    await assertPlayersNotInClan(event.id, uniqueMembers);
    await db.insert(clashClanMembers).values(
      uniqueMembers.map((minecraftName) => ({
        eventId: event.id,
        clanId,
        minecraftName,
        discordUserId:
          minecraftName.toLowerCase() === input.kingUsername.toLowerCase() ? String(ctx.session.accountId) : null,
        discordUsername:
          minecraftName.toLowerCase() === input.kingUsername.toLowerCase() ? ctx.session.minecraftUsername : null,
        isLeader: minecraftName.toLowerCase() === input.kingUsername.toLowerCase() ? 1 : 0,
        source: "ADMIN" as const,
      })),
    );
    await enforceClanSize(clanId, event.maxMembersPerClan);
    await writeAudit({
      eventId: event.id,
      clanId,
      actorAccountId: String(ctx.session.accountId),
      actorDisplayName: ctx.session.minecraftUsername,
      action: "CLAN_CREATED",
      payload: input,
    });
    return getClanWithMembers(clanId);
  }),

  adminUpdateClanSettings: adminProcedure
    .input(
      z.object({
        clanId: z.number().int().positive(),
        trim: z.enum(CLASH_TRIM_OPTIONS),
        material: z.enum(CLASH_MATERIAL_OPTIONS),
        color: z.enum(CLASH_COLOR_OPTIONS),
        discordServerLink: z.string().trim().regex(DISCORD_INVITE_REGEX, "Enter a valid Discord invite link."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const clan = await requireClanById(input.clanId, event.id);
      await db
        .update(clashClans)
        .set({
          trim: input.trim,
          material: input.material,
          color: input.color,
          discordServerLink: input.discordServerLink,
        })
        .where(eq(clashClans.id, clan.id));
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "CLAN_UPDATED",
        payload: input,
      });
      return getClanWithMembers(clan.id);
    }),

  adminReviewClan: adminProcedure
    .input(
      z
        .object({
          clanId: z.number().int().positive(),
          status: z.enum(CLASH_REVIEW_STATUS_OPTIONS).refine((status) => status !== "PENDING", {
            message: "Review status must be APPROVED or DECLINED.",
          }),
          reason: z.string().trim().max(255).optional(),
        })
        .superRefine((value, refinementCtx) => {
          if (value.status === "DECLINED" && !value.reason) {
            refinementCtx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Decline reason is required.",
              path: ["reason"],
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const clan = await requireClanById(input.clanId, event.id);
      await db
        .update(clashClans)
        .set({
          reviewStatus: input.status,
          reviewDeclineReason: input.status === "DECLINED" ? input.reason ?? null : null,
          reviewedByAccountId: String(ctx.session.accountId),
          reviewedAt: new Date(),
        })
        .where(eq(clashClans.id, clan.id));
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "CLAN_UPDATED",
        payload: { reviewStatus: input.status, reason: input.reason ?? null },
      });
      return getClanWithMembers(clan.id);
    }),

  adminDeleteClan: adminProcedure
    .input(z.object({ clanId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const clan = await requireClanById(input.clanId, event.id);
      await db.delete(clashClans).where(eq(clashClans.id, clan.id));
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "CLAN_DELETED",
        payload: { clanId: clan.id, name: clan.name },
      });
      return { ok: true };
    }),

  adminAddMember: adminProcedure
    .input(
      addMemberSchema.extend({
        clanId: z.number().int().positive(),
        source: z.enum(CLASH_MEMBER_SOURCE_OPTIONS).default("ADMIN"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const clan = await requireClanById(input.clanId, event.id);
      await db.insert(clashClanMembers).values({
        eventId: event.id,
        clanId: clan.id,
        minecraftName: input.minecraftName,
        isLeader: 0,
        source: input.source,
      });
      await enforceClanSize(clan.id, event.maxMembersPerClan);
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "MEMBER_ADDED",
        payload: input,
      });
      return getClanWithMembers(clan.id);
    }),

  adminMoveMember: adminProcedure
    .input(
      z.object({
        memberId: z.number().int().positive(),
        targetClanId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const targetClan = await requireClanById(input.targetClanId, event.id);
      const [member] = await db
        .select()
        .from(clashClanMembers)
        .where(and(eq(clashClanMembers.id, input.memberId), eq(clashClanMembers.eventId, event.id)))
        .limit(1);
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      }
      await db
        .update(clashClanMembers)
        .set({ clanId: targetClan.id, isLeader: 0 })
        .where(eq(clashClanMembers.id, member.id));
      await enforceClanSize(targetClan.id, event.maxMembersPerClan);
      await writeAudit({
        eventId: event.id,
        clanId: targetClan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "MEMBER_MOVED",
        payload: { memberId: member.id, fromClanId: member.clanId, targetClanId: targetClan.id },
      });
      return getClanWithMembers(targetClan.id);
    }),

  adminRemoveMember: adminProcedure
    .input(z.object({ memberId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const [member] = await db
        .select()
        .from(clashClanMembers)
        .where(and(eq(clashClanMembers.id, input.memberId), eq(clashClanMembers.eventId, event.id)))
        .limit(1);
      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
      }
      await db.delete(clashClanMembers).where(eq(clashClanMembers.id, member.id));
      await writeAudit({
        eventId: event.id,
        clanId: member.clanId,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "MEMBER_REMOVED",
        payload: { memberId: member.id, minecraftName: member.minecraftName },
      });
      return { ok: true };
    }),

  adminSetLeader: adminProcedure
    .input(
      z.object({
        clanId: z.number().int().positive(),
        memberId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getClashDb();
      const event = await getActiveEvent();
      const clan = await requireClanById(input.clanId, event.id);
      const [newLeader] = await db
        .select()
        .from(clashClanMembers)
        .where(and(eq(clashClanMembers.id, input.memberId), eq(clashClanMembers.clanId, clan.id)))
        .limit(1);
      if (!newLeader) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found in this clan." });
      }
      await db.update(clashClanMembers).set({ isLeader: 0 }).where(eq(clashClanMembers.clanId, clan.id));
      await db.update(clashClanMembers).set({ isLeader: 1 }).where(eq(clashClanMembers.id, newLeader.id));
      await db
        .update(clashClans)
        .set({ leaderDiscordUserId: newLeader.discordUserId ?? clan.leaderDiscordUserId })
        .where(eq(clashClans.id, clan.id));
      await writeAudit({
        eventId: event.id,
        clanId: clan.id,
        actorAccountId: String(ctx.session.accountId),
        actorDisplayName: ctx.session.minecraftUsername,
        action: "LEADER_CHANGED",
        payload: { memberId: newLeader.id, minecraftName: newLeader.minecraftName },
      });
      return getClanWithMembers(clan.id);
    }),

  adminResetAccountPassword: adminProcedure
    .input(
      z.object({
        username: z.string().trim().min(1).max(32),
        newPassword: z.string().min(8).max(128),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getClashDb();
      const usernameKey = normalizeUsername(input.username);
      const [account] = await db
        .select({ id: clashAccounts.id, minecraftUsername: clashAccounts.minecraftUsername })
        .from(clashAccounts)
        .where(eq(clashAccounts.usernameKey, usernameKey))
        .limit(1);
      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      }
      await db
        .update(clashAccounts)
        .set({
          passwordHash: hashPassword(input.newPassword),
        })
        .where(eq(clashAccounts.id, account.id));
      return {
        ok: true,
        accountId: account.id,
        minecraftUsername: account.minecraftUsername,
      };
    }),
});
