import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { resolveLuckPermsPrimaryGroups } from "../queries/luckPerms";
import { players } from "@db/schema";
import { eq, sql } from "drizzle-orm";

function extractRows<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) {
    if (raw.length > 0 && Array.isArray(raw[0])) {
      return raw[0] as T[];
    }
    return raw as T[];
  }
  if (raw && typeof raw === "object") {
    const maybeRows = (raw as { rows?: unknown }).rows;
    if (Array.isArray(maybeRows)) {
      return maybeRows as T[];
    }
  }
  return [];
}

function toHeadAvatarUrl(avatarUrl: string | null | undefined, idOrUsername: string): string {
  const source = (avatarUrl ?? "").trim();
  if (source.length > 0) {
    const hashMatch = source.match(/\/texture\/([a-f0-9]+)$/i);
    if (hashMatch?.[1]) {
      return `https://mc-heads.net/avatar/${hashMatch[1]}/64`;
    }
  }
  return `https://mc-heads.net/avatar/${encodeURIComponent(idOrUsername)}/64`;
}

function xpRequiredForLevel(level: number): number {
  if (level >= 1000) {
    return 0;
  }
  if (level <= 1) {
    return 500;
  }
  if (level === 2) {
    return 750;
  }
  if (level === 3) {
    return 1000;
  }
  if (level === 4) {
    return 1250;
  }
  if (level === 5) {
    return 1500;
  }
  if (level === 6) {
    return 1750;
  }
  if (level === 7) {
    return 2000;
  }
  if (level === 8) {
    return 2500;
  }
  return 3000;
}

function prettifyLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampPerkTier(value: number | null | undefined): number {
  const tier = Number(value ?? 1);
  if (!Number.isFinite(tier)) return 1;
  return Math.max(1, Math.min(5, Math.trunc(tier)));
}

function perkSummary(perkKey: string, tier: number): string {
  const t = clampPerkTier(tier);
  switch (perkKey) {
    case "experience_boost": {
      const pct = [5, 8, 10, 12, 15][t - 1];
      return `+${pct}% XP`;
    }
    case "haste": {
      const sec = [4, 5, 6, 8, 10][t - 1];
      return `${sec}s Haste II`;
    }
    case "starter_health": {
      const min = [10, 12, 13, 14, 15][t - 1];
      return `${min}m Absorption IV`;
    }
    case "speed": {
      const sec = [10, 12, 13, 14, 15][t - 1];
      return `${sec}s Speed II`;
    }
    case "golden_bounty": {
      const nuggets = [10, 12, 14, 16, 18][t - 1];
      return `${nuggets} Nuggets / kill`;
    }
    case "saturation": {
      const min = [10, 11, 12, 13, 15][t - 1];
      return `${min}m Saturation I`;
    }
    default:
      return `Tier ${t}`;
  }
}

export const playerRouter = createRouter({
  search: publicQuery
    .input(z.object({
      query: z.string().min(1).max(32),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const raw = await db.execute(sql`
        SELECT
          LOWER(HEX(web_profile.unique_id)) AS id,
          web_profile.player_name AS username,
          web_profile.skin_url AS avatarUrl,
          COALESCE(profile.rank, 'default') AS rankKey,
          COALESCE(profile.level, 1) AS level
        FROM player_web_profile web_profile
        LEFT JOIN player_profile profile ON profile.unique_id = web_profile.unique_id
        WHERE LOWER(web_profile.player_name) LIKE LOWER(${`%${input.query}%`})
        ORDER BY
          CASE
            WHEN LOWER(web_profile.player_name) = LOWER(${input.query}) THEN 0
            WHEN LOWER(web_profile.player_name) LIKE LOWER(${`${input.query}%`}) THEN 1
            ELSE 2
          END,
          web_profile.updated_at DESC
        LIMIT ${input.limit}
      `);
      const rows = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
      }>(raw);
      const luckPermsGroups = await resolveLuckPermsPrimaryGroups(rows.map((row) => row.id));
      return rows.map((row) => {
        const uuidHex = (row.id ?? "").toLowerCase();
        const fallbackRank = (row.rankKey ?? "default").toLowerCase();
        return {
          ...row,
          avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
          rankKey: luckPermsGroups.get(uuidHex) ?? fallbackRank,
          level: Number(row.level ?? 1),
        };
      });
    }),

  previewByUsername: publicQuery
    .input(z.object({
      username: z.string().min(1).max(32),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const raw = await db.execute(sql`
        WITH target AS (
          SELECT
            web_profile.unique_id,
            web_profile.player_name,
            web_profile.skin_url
          FROM player_web_profile web_profile
          LEFT JOIN player_profile profile ON profile.unique_id = web_profile.unique_id
          WHERE LOWER(web_profile.player_name) = LOWER(${input.username})
          ORDER BY
            (
              COALESCE(profile.class_miner_level, 1) +
              COALESCE(profile.class_warrior_level, 1) +
              COALESCE(profile.class_archer_level, 1) +
              COALESCE(profile.class_looter_level, 1) +
              COALESCE(profile.class_trapper_level, 1) +
              COALESCE(profile.class_fisherman_level, 1) +
              COALESCE(profile.br_perk_haste, 1) +
              COALESCE(profile.br_perk_experience_boost, 1) +
              COALESCE(profile.br_perk_starter_health, 1) +
              COALESCE(profile.br_perk_speed, 1) +
              COALESCE(profile.br_perk_golden_bounty, 1) +
              COALESCE(profile.br_perk_saturation, 1)
            ) DESC,
            COALESCE(profile.level, 1) DESC,
            COALESCE(profile.exp, 0) DESC,
            COALESCE(profile.updated_at, web_profile.updated_at) DESC,
            web_profile.updated_at DESC
          LIMIT 1
        ),
        agg AS (
          SELECT
            SUM(stats.wins) AS wins,
            SUM(stats.losses) AS losses,
            SUM(stats.kills) AS kills,
            SUM(stats.deaths) AS deaths,
            SUM(stats.matches_played) AS matchesPlayed
          FROM player_stats_mode_all stats
          INNER JOIN target ON target.unique_id = stats.player_uuid
        )
        SELECT
          LOWER(HEX(target.unique_id)) AS id,
          target.player_name AS username,
          target.skin_url AS avatarUrl,
          COALESCE(profile.rank, 'default') AS rankKey,
          COALESCE(profile.level, 1) AS level,
          COALESCE(profile.exp, 0) AS exp,
          COALESCE(agg.wins, 0) AS wins,
          COALESCE(agg.losses, 0) AS losses,
          COALESCE(agg.kills, 0) AS kills,
          COALESCE(agg.deaths, 0) AS deaths,
          COALESCE(agg.matchesPlayed, 0) AS matchesPlayed
        FROM target
        LEFT JOIN player_profile profile ON profile.unique_id = target.unique_id
        LEFT JOIN agg ON 1 = 1
      `);
      const [row] = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
        exp: number | null;
        wins: number;
        losses: number;
        kills: number;
        deaths: number;
        matchesPlayed: number;
      }>(raw);
      if (!row) {
        return null;
      }
      const kills = Number(row.kills ?? 0);
      const deaths = Number(row.deaths ?? 0);
      const matchesPlayed = Number(row.matchesPlayed ?? 0);
      const wins = Number(row.wins ?? 0);
      const level = Number(row.level ?? 1);
      const expCurrent = Number(row.exp ?? 0);
      const expRequired = xpRequiredForLevel(level);
      const winRate = matchesPlayed > 0 ? wins / matchesPlayed : 0;
      const kda = deaths > 0 ? kills / deaths : kills;
      const killAverage = matchesPlayed > 0 ? kills / matchesPlayed : 0;
      const luckPermsGroups = await resolveLuckPermsPrimaryGroups([row.id]);
      const fallbackRank = (row.rankKey ?? "default").toLowerCase();
      return {
        ...row,
        avatarUrl: toHeadAvatarUrl(row.avatarUrl, row.id || row.username),
        rankKey: luckPermsGroups.get((row.id ?? "").toLowerCase()) ?? fallbackRank,
        level,
        expCurrent,
        expRequired,
        expProgress: expRequired > 0 ? Math.max(0, Math.min(1, expCurrent / expRequired)) : 1,
        wins,
        losses: Number(row.losses ?? 0),
        kills,
        deaths,
        matchesPlayed,
        winRate,
        kda,
        killAverage,
      };
    }),

  getByUsername: publicQuery
    .input(z.object({
      username: z.string().min(1).max(32),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const targetRaw = await db.execute(sql`
        SELECT
          LOWER(HEX(web_profile.unique_id)) AS id,
          web_profile.player_name AS username,
          web_profile.skin_url AS avatarUrl,
          COALESCE(profile.rank, 'default') AS rankKey,
          COALESCE(profile.level, 1) AS level,
          COALESCE(profile.exp, 0) AS exp,
          COALESCE(profile.class_miner_level, 1) AS classMinerLevel,
          COALESCE(profile.class_warrior_level, 1) AS classWarriorLevel,
          COALESCE(profile.class_archer_level, 1) AS classArcherLevel,
          COALESCE(profile.class_looter_level, 1) AS classLooterLevel,
          COALESCE(profile.class_trapper_level, 1) AS classTrapperLevel,
          COALESCE(profile.class_fisherman_level, 1) AS classFishermanLevel,
          COALESCE(profile.br_perk_haste, 1) AS perkHaste,
          COALESCE(profile.br_perk_experience_boost, 1) AS perkExperienceBoost,
          COALESCE(profile.br_perk_starter_health, 1) AS perkStarterHealth,
          COALESCE(profile.br_perk_speed, 1) AS perkSpeed,
          COALESCE(profile.br_perk_golden_bounty, 1) AS perkGoldenBounty,
          COALESCE(profile.br_perk_saturation, 1) AS perkSaturation,
          profile.updated_at AS profileUpdatedAt,
          COALESCE(global_stats.legendary_crafts, 0) AS legendaryCrafts
        FROM player_web_profile web_profile
        LEFT JOIN player_profile profile ON profile.unique_id = web_profile.unique_id
        LEFT JOIN player_global_stats global_stats ON global_stats.unique_id = web_profile.unique_id
        WHERE LOWER(web_profile.player_name) = LOWER(${input.username})
        ORDER BY
          (
            COALESCE(profile.class_miner_level, 1) +
            COALESCE(profile.class_warrior_level, 1) +
            COALESCE(profile.class_archer_level, 1) +
            COALESCE(profile.class_looter_level, 1) +
            COALESCE(profile.class_trapper_level, 1) +
            COALESCE(profile.class_fisherman_level, 1) +
            COALESCE(profile.br_perk_haste, 1) +
            COALESCE(profile.br_perk_experience_boost, 1) +
            COALESCE(profile.br_perk_starter_health, 1) +
            COALESCE(profile.br_perk_speed, 1) +
            COALESCE(profile.br_perk_golden_bounty, 1) +
            COALESCE(profile.br_perk_saturation, 1)
          ) DESC,
          COALESCE(profile.level, 1) DESC,
          COALESCE(profile.exp, 0) DESC,
          COALESCE(profile.updated_at, web_profile.updated_at) DESC,
          web_profile.updated_at DESC
        LIMIT 1
      `);
      const [target] = extractRows<{
        id: string;
        username: string;
        avatarUrl: string | null;
        rankKey: string | null;
        level: number | null;
        exp: number | null;
        classMinerLevel: number | null;
        classWarriorLevel: number | null;
        classArcherLevel: number | null;
        classLooterLevel: number | null;
        classTrapperLevel: number | null;
        classFishermanLevel: number | null;
        perkHaste: number | null;
        perkExperienceBoost: number | null;
        perkStarterHealth: number | null;
        perkSpeed: number | null;
        perkGoldenBounty: number | null;
        perkSaturation: number | null;
        profileUpdatedAt: Date | string | null;
        legendaryCrafts: number | null;
      }>(targetRaw);
      if (!target) return null;

      const aggRaw = await db.execute(sql`
        SELECT
          COALESCE(SUM(pms.wins), 0) AS totalWins,
          COALESCE(SUM(pms.losses), 0) AS totalLosses,
          COALESCE(SUM(pms.kills), 0) AS totalKills,
          COALESCE(SUM(pms.deaths), 0) AS totalDeaths,
          COALESCE(SUM(pms.damage_dealt), 0) AS totalDamageDealt,
          COALESCE(SUM(pms.damage_taken), 0) AS totalDamageTaken,
          COALESCE(SUM(pms.total_healing_used), 0) AS totalHealingUsed,
          COALESCE(MAX(pms.damage_dealt), 0) AS maxDamageInMatch,
          COALESCE(MAX(pms.kills), 0) AS maxKillsInMatch,
          COALESCE(MIN(pms.recorded_at), NULL) AS firstMatchAt,
          COALESCE(MAX(pms.recorded_at), NULL) AS lastMatchAt,
          COUNT(*) AS matchesPlayed
        FROM player_match_stats pms
        WHERE LOWER(HEX(pms.player_uuid)) = ${target.id}
      `);
      const [agg] = extractRows<{
        totalWins: number;
        totalLosses: number;
        totalKills: number;
        totalDeaths: number;
        totalDamageDealt: number;
        totalDamageTaken: number;
        totalHealingUsed: number;
        maxDamageInMatch: number;
        maxKillsInMatch: number;
        firstMatchAt: Date | string | null;
        lastMatchAt: Date | string | null;
        matchesPlayed: number;
      }>(aggRaw);

      const modeRaw = await db.execute(sql`
        SELECT
          pms.gamemode_key AS modeSlug,
          COALESCE(SUM(pms.matches_played), 0) AS matchesPlayed,
          COALESCE(SUM(pms.wins), 0) AS wins,
          COALESCE(SUM(pms.losses), 0) AS losses,
          COALESCE(SUM(pms.kills), 0) AS kills,
          COALESCE(SUM(pms.deaths), 0) AS deaths,
          COALESCE(SUM(pms.damage_dealt), 0) AS damageDealt
        FROM player_match_stats pms
        WHERE LOWER(HEX(pms.player_uuid)) = ${target.id}
        GROUP BY pms.gamemode_key
        ORDER BY matchesPlayed DESC, wins DESC
      `);
      const modeBreakdown = extractRows<{
        modeSlug: string;
        matchesPlayed: number;
        wins: number;
        losses: number;
        kills: number;
        deaths: number;
        damageDealt: number;
      }>(modeRaw).map((row) => {
        const matchesPlayed = Number(row.matchesPlayed ?? 0);
        const wins = Number(row.wins ?? 0);
        return {
          modeSlug: row.modeSlug,
          modeName: prettifyLabel(row.modeSlug),
          matchesPlayed,
          wins,
          losses: Number(row.losses ?? 0),
          kills: Number(row.kills ?? 0),
          deaths: Number(row.deaths ?? 0),
          damageDealt: Number(row.damageDealt ?? 0),
          winRate: matchesPlayed > 0 ? wins / matchesPlayed : 0,
        };
      });

      const classRaw = await db.execute(sql`
        SELECT
          pms.kit_key AS kitKey,
          COUNT(*) AS uses,
          COALESCE(SUM(pms.wins), 0) AS wins,
          COALESCE(SUM(pms.losses), 0) AS losses,
          COALESCE(SUM(pms.kills), 0) AS kills
        FROM player_match_stats pms
        WHERE LOWER(HEX(pms.player_uuid)) = ${target.id}
        GROUP BY pms.kit_key
        ORDER BY uses DESC, wins DESC, kills DESC
        LIMIT 6
      `);
      const classUsage = extractRows<{
        kitKey: string;
        uses: number;
        wins: number;
        losses: number;
        kills: number;
      }>(classRaw).map((row) => ({
        kitKey: row.kitKey,
        className: prettifyLabel(row.kitKey),
        uses: Number(row.uses ?? 0),
        wins: Number(row.wins ?? 0),
        losses: Number(row.losses ?? 0),
        kills: Number(row.kills ?? 0),
      }));

      const matchesPlayed = Number(agg?.matchesPlayed ?? 0);
      const totalWins = Number(agg?.totalWins ?? 0);
      const totalLosses = Number(agg?.totalLosses ?? 0);
      const totalKills = Number(agg?.totalKills ?? 0);
      const totalDeaths = Number(agg?.totalDeaths ?? 0);
      const totalDamageDealt = Number(agg?.totalDamageDealt ?? 0);
      const totalDamageTaken = Number(agg?.totalDamageTaken ?? 0);
      const totalHealingUsed = Number(agg?.totalHealingUsed ?? 0);
      const maxDamageInMatch = Number(agg?.maxDamageInMatch ?? 0);
      const maxKillsInMatch = Number(agg?.maxKillsInMatch ?? 0);
      const level = Number(target.level ?? 1);
      const expCurrent = Number(target.exp ?? 0);
      const expRequired = xpRequiredForLevel(level);
      const winRate = matchesPlayed > 0 ? totalWins / matchesPlayed : 0;
      const kda = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
      const avgDamagePerMatch = matchesPlayed > 0 ? totalDamageDealt / matchesPlayed : 0;
      const luckPermsGroups = await resolveLuckPermsPrimaryGroups([target.id]);
      const fallbackRank = (target.rankKey ?? "default").toLowerCase();
      const mostUsedClass = classUsage[0]?.className ?? "Unknown";
      const totalLegendariesCrafted = Math.max(0, Number(target.legendaryCrafts ?? 0));
      const joinDate = agg?.firstMatchAt ?? target.profileUpdatedAt ?? new Date();
      const lastSeenAt = agg?.lastMatchAt ?? target.profileUpdatedAt ?? null;
      const classUpgradeLevels = [
        { key: "miner", name: "Miner", level: Math.max(1, Number(target.classMinerLevel ?? 1)) },
        { key: "warrior", name: "Warrior", level: Math.max(1, Number(target.classWarriorLevel ?? 1)) },
        { key: "archer", name: "Archer", level: Math.max(1, Number(target.classArcherLevel ?? 1)) },
        { key: "looter", name: "Looter", level: Math.max(1, Number(target.classLooterLevel ?? 1)) },
        { key: "trapper", name: "Trapper", level: Math.max(1, Number(target.classTrapperLevel ?? 1)) },
        { key: "fisherman", name: "Fisherman", level: Math.max(1, Number(target.classFishermanLevel ?? 1)) },
      ];
      const perkLevels = [
        { key: "experience_boost", name: "Experience Boost", level: clampPerkTier(target.perkExperienceBoost) },
        { key: "haste", name: "Haste", level: clampPerkTier(target.perkHaste) },
        { key: "starter_health", name: "Starter Health", level: clampPerkTier(target.perkStarterHealth) },
        { key: "speed", name: "Speed", level: clampPerkTier(target.perkSpeed) },
        { key: "golden_bounty", name: "Golden Bounty", level: clampPerkTier(target.perkGoldenBounty) },
        { key: "saturation", name: "Saturation", level: clampPerkTier(target.perkSaturation) },
      ].map((perk) => ({
        ...perk,
        summary: perkSummary(perk.key, perk.level),
      }));

      return {
        id: target.id,
        username: target.username,
        avatarUrl: toHeadAvatarUrl(target.avatarUrl, target.id || target.username),
        rankKey: luckPermsGroups.get((target.id ?? "").toLowerCase()) ?? fallbackRank,
        level,
        expCurrent,
        expRequired,
        expProgress: expRequired > 0 ? Math.max(0, Math.min(1, expCurrent / expRequired)) : 1,
        joinDate: new Date(joinDate),
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
        region: "Global",
        matchesPlayed,
        totalWins,
        totalLosses,
        winRate,
        totalKills,
        totalDeaths,
        kda,
        totalDamageDealt,
        totalDamageTaken,
        totalHealingUsed,
        maxDamageInMatch,
        maxKillsInMatch,
        avgDamagePerMatch,
        mostUsedClass,
        totalLegendariesCrafted,
        classUsage,
        classUpgradeLevels,
        perkLevels,
        modeBreakdown,
      };
    }),

  getById: publicQuery
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, input.id))
        .limit(1);
      return player ?? null;
    }),
});
