import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { resolveLuckPermsPrimaryGroups } from "../queries/luckPerms";
import { matches, tierHistory, gameModes, players } from "@db/schema";
import { and, desc, eq, gte, sql, type SQL } from "drizzle-orm";
import type {
  AdvancedStatsAvailability,
  MatchListItem,
  MatchListResponse,
  WinnerInventorySnapshot,
  WinnerInventorySlotItem,
} from "@contracts/match-history";

const DATE_WINDOW_VALUES = ["24h", "7d", "30d", "all"] as const;

const MATCH_CAPABILITIES: AdvancedStatsAvailability = {
  timeline: false,
  combatBreakdown: false,
  movementBreakdown: false,
  socialGraph: false,
  ratingImpact: false,
  partyInfo: false,
  advancedInventory: true,
};

function getDateWindowStart(dateWindow: (typeof DATE_WINDOW_VALUES)[number]): Date | null {
  if (dateWindow === "all") return null;
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  const windowMs = dateWindow === "24h" ? 24 * hourMs : dateWindow === "7d" ? 7 * 24 * hourMs : 30 * 24 * hourMs;
  return new Date(now - windowMs);
}

function emptyMatchResponse(limit: number, offset: number): MatchListResponse {
  return {
    items: [],
    total: 0,
    limit,
    offset,
    hasMore: false,
    capabilities: MATCH_CAPABILITIES,
  };
}

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

function prettifyModeLabel(modeSlug: string): string {
  if (!modeSlug) return "Unknown";
  return modeSlug
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeModeKey(rawModeKey: string | null | undefined): MatchListItem["modeKey"] {
  const normalized = (rawModeKey ?? "").trim().toLowerCase();
  if (normalized === "solo") return "solo";
  if (normalized === "duo") return "duo";
  if (normalized === "trio") return "trio";
  if (normalized === "quads" || normalized === "quad") return "quads";
  if (normalized === "civ" || normalized === "civilization") return "civ";
  return "unknown";
}

function parseWinningPlayersRaw(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("||")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function materialToDisplay(material: string): string {
  return material.toLowerCase().replace(/_/g, " ");
}

function parseLegacyInventoryItem(entry: string, slotIndex: number): WinnerInventorySlotItem {
  const match = entry.match(/^(.*)\sx(\d+)$/i);
  const rawName = (match?.[1] ?? entry).trim();
  const amount = Number(match?.[2] ?? "1");
  const material = rawName.toUpperCase().replace(/\s+/g, "_");
  return {
    slotKey: `legacy.${slotIndex}`,
    slotIndex,
    material,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    displayName: rawName.length > 0 ? rawName : materialToDisplay(material),
    lore: [],
    enchantments: [],
    customModelData: null,
    damage: null,
    unbreakable: false,
    itemFlags: [],
    customKeyCandidates: [],
  };
}

function parseWinnerInventoryRaw(raw: string | null | undefined): {
  winnerInventoryItems: string[];
  winnerInventory: WinnerInventorySnapshot | null;
} {
  if (!raw || raw.trim().length === 0) {
    return { winnerInventoryItems: [], winnerInventory: null };
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as {
        version?: unknown;
        layout?: unknown;
        capturedAtEpochMs?: unknown;
        items?: unknown;
      };
      const jsonItems = Array.isArray(parsed.items) ? parsed.items : [];
      const items: WinnerInventorySlotItem[] = jsonItems
        .map((item, idx) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const material = typeof row.material === "string" && row.material.length > 0 ? row.material : "UNKNOWN";
          const amountRaw = Number(row.amount ?? 1);
          const slotIndexRaw = Number(row.slotIndex ?? idx);
          return {
            slotKey:
              typeof row.slotKey === "string" && row.slotKey.length > 0
                ? row.slotKey
                : `inventory.${Number.isFinite(slotIndexRaw) ? slotIndexRaw : idx}`,
            slotIndex: Number.isFinite(slotIndexRaw) ? slotIndexRaw : idx,
            material,
            amount: Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 1,
            displayName:
              typeof row.displayName === "string" && row.displayName.length > 0
                ? row.displayName
                : materialToDisplay(material),
            lore: Array.isArray(row.lore) ? row.lore.filter((v): v is string => typeof v === "string") : [],
            enchantments: Array.isArray(row.enchantments)
              ? row.enchantments
                  .map((ench) => {
                    if (!ench || typeof ench !== "object") return null;
                    const value = ench as Record<string, unknown>;
                    const key = typeof value.key === "string" ? value.key : "minecraft:unknown";
                    const level = Number(value.level ?? 1);
                    return {
                      key,
                      level: Number.isFinite(level) && level > 0 ? level : 1,
                    };
                  })
                  .filter((entry): entry is { key: string; level: number } => entry !== null)
              : [],
            customModelData:
              row.customModelData === null || row.customModelData === undefined
                ? null
                : Number.isFinite(Number(row.customModelData))
                  ? Number(row.customModelData)
                  : null,
            damage:
              row.damage === null || row.damage === undefined
                ? null
                : Number.isFinite(Number(row.damage))
                  ? Number(row.damage)
                  : null,
            unbreakable: row.unbreakable === true,
            itemFlags: Array.isArray(row.itemFlags)
              ? row.itemFlags.filter((v): v is string => typeof v === "string")
              : [],
            customKeyCandidates: Array.isArray(row.customKeyCandidates)
              ? row.customKeyCandidates.filter((v): v is string => typeof v === "string")
              : [],
          };
        })
        .filter((entry): entry is WinnerInventorySlotItem => entry !== null);

      const winnerInventoryItems = items.map((item) => `${item.displayName} x${item.amount}`);
      return {
        winnerInventoryItems,
        winnerInventory: {
          version: Number.isFinite(Number(parsed.version)) ? Number(parsed.version) : 2,
          layout: parsed.layout === "chest" ? "chest" : "player_inventory",
          source: "v2",
          capturedAtEpochMs:
            Number.isFinite(Number(parsed.capturedAtEpochMs)) ? Number(parsed.capturedAtEpochMs) : null,
          items,
        },
      };
    } catch {
      // Fall through to legacy parsing if JSON is invalid.
    }
  }

  const legacyEntries = trimmed
    .split("||")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const legacyItems = legacyEntries.map((entry, index) => parseLegacyInventoryItem(entry, index));
  return {
    winnerInventoryItems: legacyEntries,
    winnerInventory: legacyItems.length
      ? {
          version: 1,
          layout: "player_inventory",
          source: "legacy",
          capturedAtEpochMs: null,
          items: legacyItems,
        }
      : null,
  };
}

async function resolveLegacyUsernameByPlayerId(playerId: number | undefined): Promise<string | null> {
  if (!playerId) return null;
  const db = getDb();
  const [row] = await db
    .select({ username: players.username })
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  return row?.username ?? null;
}

async function queryMatchList(input: {
  playerId?: number;
  playerUsername?: string;
  mode?: string;
  winsOnly: boolean;
  dateWindow: (typeof DATE_WINDOW_VALUES)[number];
  limit: number;
  offset: number;
}): Promise<MatchListResponse> {
  const db = getDb();
  const playerUsername = input.playerUsername ?? (await resolveLegacyUsernameByPlayerId(input.playerId)) ?? undefined;
  const hasPlayerFilter = Boolean(playerUsername);

  const windowStart = getDateWindowStart(input.dateWindow);
  const modernConditions: SQL[] = [];
  if (playerUsername) modernConditions.push(sql`LOWER(COALESCE(participant.player_name, '')) = LOWER(${playerUsername})`);
  if (input.mode) modernConditions.push(sql`pms.gamemode_key = ${input.mode}`);
  if (input.winsOnly) modernConditions.push(sql`pms.wins > 0`);
  if (windowStart) modernConditions.push(sql`COALESCE(m.ended_at, pms.recorded_at) >= ${windowStart}`);
  const modernWhere = modernConditions.length > 0 ? sql`WHERE ${sql.join(modernConditions, sql` AND `)}` : sql``;

  const globalConditions: SQL[] = [];
  if (input.mode) globalConditions.push(sql`winner_stats.gamemode_key = ${input.mode}`);
  if (windowStart) globalConditions.push(sql`COALESCE(m.ended_at, winner_stats.recorded_at, m.created_at) >= ${windowStart}`);
  const globalWhere = globalConditions.length > 0 ? sql`WHERE ${sql.join(globalConditions, sql` AND `)}` : sql``;

  try {
    const modernRowsRaw = hasPlayerFilter
      ? await db.execute(sql`
          SELECT
            CONCAT(LOWER(HEX(pms.match_id)), ':', LOWER(HEX(pms.player_uuid))) AS id,
            LOWER(HEX(pms.match_id)) AS matchPublicId,
            NULL AS playerId,
            COALESCE(participant.player_name, LEFT(LOWER(HEX(pms.player_uuid)), 12)) AS playerUsername,
            LOWER(HEX(pms.player_uuid)) AS playerUuidHex,
            participant.skin_url AS playerAvatarUrl,
            COALESCE(participant_profile.rank, 'default') AS playerRankKey,
            COALESCE(participant_profile.level, 1) AS playerLevel,
            NULL AS opponentId,
            COALESCE(
              (
                SELECT COALESCE(opp_profile.player_name, LEFT(LOWER(HEX(mr.player_uuid)), 12))
                FROM match_roster mr
                LEFT JOIN player_web_profile opp_profile ON opp_profile.unique_id = mr.player_uuid
                WHERE mr.match_id = pms.match_id AND mr.player_uuid <> pms.player_uuid
                ORDER BY mr.joined_at ASC
                LIMIT 1
              ),
              'Unknown'
            ) AS opponentName,
            pms.gamemode_key AS modeSlug,
            COALESCE(
              NULLIF(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.modeKey')), ''),
              pms.gamemode_key
            ) AS modeKey,
            COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.isCustomGame')) AS UNSIGNED), 0) AS isCustomGame,
            CASE WHEN pms.wins > 0 THEN 'WIN' WHEN pms.losses > 0 THEN 'LOSS' ELSE 'DRAW' END AS result,
            COALESCE(pms.kills, 0) AS playerScore,
            0 AS opponentScore,
            NULL AS tierChange,
            COALESCE(m.ended_at, pms.recorded_at) AS playedAt,
            CAST(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.teamSize')) AS UNSIGNED) AS teamSize,
            (
              SELECT COUNT(*) FROM match_roster roster_count
              WHERE roster_count.match_id = pms.match_id
            ) AS playersJoined,
            CASE
              WHEN m.game_started_at IS NULL OR m.ended_at IS NULL THEN NULL
              ELSE TIMESTAMPDIFF(SECOND, m.game_started_at, m.ended_at)
            END AS matchDurationSeconds,
            CASE WHEN pms.wins > 0 THEN 1 ELSE NULL END AS placement,
            COALESCE(pms.kills, 0) AS kills,
            COALESCE(pms.damage_dealt, 0) AS damageDealt,
            COALESCE(pms.damage_taken, 0) AS damageTaken,
            COALESCE(pms.survival_seconds, 0) AS survivalTimeSeconds,
            NULLIF(pms.kit_key, '') AS kitUsed,
            NULLIF(pms.best_weapon, '') AS bestWeapon,
            NULLIF(pms.highest_armor_tier, '') AS highestArmorTier,
            COALESCE(pms.total_healing_used, 0) AS totalHealingUsed,
            NULLIF(pms.final_kill_by, '') AS finalKillBy,
            NULLIF(pms.final_death_by, '') AS finalDeathBy,
            (
              SELECT GROUP_CONCAT(
                COALESCE(winner_profile.player_name, LEFT(LOWER(HEX(winner_stats.player_uuid)), 12))
                ORDER BY COALESCE(winner_profile.player_name, LEFT(LOWER(HEX(winner_stats.player_uuid)), 12)) ASC
                SEPARATOR '||'
              )
              FROM player_match_stats winner_stats
              LEFT JOIN player_web_profile winner_profile ON winner_profile.unique_id = winner_stats.player_uuid
              WHERE winner_stats.match_id = pms.match_id AND winner_stats.wins > 0
            ) AS winningPlayersRaw,
            NULLIF(pms.winner_inventory_snapshot, '') AS winnerInventoryRaw,
            (
              SELECT GROUP_CONCAT(CONCAT(COALESCE(ev.event_second, 0), '::', REPLACE(ev.description, '||', '|')) ORDER BY ev.event_second SEPARATOR '||')
              FROM player_match_timeline_event ev
              WHERE ev.match_id = pms.match_id AND ev.player_uuid = pms.player_uuid
            ) AS timelineRaw
          FROM player_match_stats pms
          LEFT JOIN uhc_match m ON m.match_id = pms.match_id
          LEFT JOIN player_web_profile participant ON participant.unique_id = pms.player_uuid
          LEFT JOIN player_profile participant_profile ON participant_profile.unique_id = pms.player_uuid
          ${modernWhere}
          ORDER BY COALESCE(m.ended_at, pms.recorded_at) DESC
          LIMIT ${input.limit} OFFSET ${input.offset}
        `)
      : await db.execute(sql`
          SELECT
            CONCAT(LOWER(HEX(m.match_id)), ':', LOWER(HEX(winner_stats.player_uuid))) AS id,
            LOWER(HEX(m.match_id)) AS matchPublicId,
            NULL AS playerId,
            COALESCE(winner_profile.player_name, LEFT(LOWER(HEX(winner_stats.player_uuid)), 12), 'Unknown') AS playerUsername,
            LOWER(HEX(winner_stats.player_uuid)) AS playerUuidHex,
            winner_profile.skin_url AS playerAvatarUrl,
            COALESCE(winner_profile_meta.rank, 'default') AS playerRankKey,
            COALESCE(winner_profile_meta.level, 1) AS playerLevel,
            NULL AS opponentId,
            'N/A' AS opponentName,
            winner_stats.gamemode_key AS modeSlug,
            COALESCE(
              NULLIF(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.modeKey')), ''),
              winner_stats.gamemode_key
            ) AS modeKey,
            COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.isCustomGame')) AS UNSIGNED), 0) AS isCustomGame,
            'WIN' AS result,
            COALESCE(winner_stats.kills, 0) AS playerScore,
            0 AS opponentScore,
            NULL AS tierChange,
            COALESCE(m.ended_at, winner_stats.recorded_at, m.created_at) AS playedAt,
            CAST(JSON_UNQUOTE(JSON_EXTRACT(m.config_json, '$.teamSize')) AS UNSIGNED) AS teamSize,
            (SELECT COUNT(*) FROM match_roster roster_count WHERE roster_count.match_id = m.match_id) AS playersJoined,
            CASE
              WHEN m.game_started_at IS NULL OR m.ended_at IS NULL THEN NULL
              ELSE TIMESTAMPDIFF(SECOND, m.game_started_at, m.ended_at)
            END AS matchDurationSeconds,
            1 AS placement,
            COALESCE(winner_stats.kills, 0) AS kills,
            COALESCE(winner_stats.damage_dealt, 0) AS damageDealt,
            COALESCE(winner_stats.damage_taken, 0) AS damageTaken,
            COALESCE(winner_stats.survival_seconds, 0) AS survivalTimeSeconds,
            NULLIF(winner_stats.kit_key, '') AS kitUsed,
            NULLIF(winner_stats.best_weapon, '') AS bestWeapon,
            NULLIF(winner_stats.highest_armor_tier, '') AS highestArmorTier,
            COALESCE(winner_stats.total_healing_used, 0) AS totalHealingUsed,
            NULLIF(winner_stats.final_kill_by, '') AS finalKillBy,
            NULLIF(winner_stats.final_death_by, '') AS finalDeathBy,
            (
              SELECT GROUP_CONCAT(
                COALESCE(team_winner_profile.player_name, LEFT(LOWER(HEX(team_winner.player_uuid)), 12))
                ORDER BY COALESCE(team_winner_profile.player_name, LEFT(LOWER(HEX(team_winner.player_uuid)), 12)) ASC
                SEPARATOR '||'
              )
              FROM player_match_stats team_winner
              LEFT JOIN player_web_profile team_winner_profile ON team_winner_profile.unique_id = team_winner.player_uuid
              WHERE team_winner.match_id = m.match_id AND team_winner.wins > 0
            ) AS winningPlayersRaw,
            NULLIF(winner_stats.winner_inventory_snapshot, '') AS winnerInventoryRaw,
            (
              SELECT GROUP_CONCAT(CONCAT(COALESCE(ev.event_second, 0), '::', REPLACE(ev.description, '||', '|')) ORDER BY ev.event_second SEPARATOR '||')
              FROM player_match_timeline_event ev
              WHERE ev.match_id = winner_stats.match_id AND ev.player_uuid = winner_stats.player_uuid
            ) AS timelineRaw
          FROM uhc_match m
          INNER JOIN player_match_stats winner_stats
            ON winner_stats.match_id = m.match_id
            AND winner_stats.player_uuid = (
              SELECT winner_pick.player_uuid
              FROM player_match_stats winner_pick
              WHERE winner_pick.match_id = m.match_id AND winner_pick.wins > 0
              ORDER BY COALESCE(winner_pick.kills, 0) DESC, winner_pick.recorded_at ASC
              LIMIT 1
            )
          LEFT JOIN player_web_profile winner_profile
            ON winner_profile.unique_id = winner_stats.player_uuid
          LEFT JOIN player_profile winner_profile_meta
            ON winner_profile_meta.unique_id = winner_stats.player_uuid
          ${globalWhere}
          ORDER BY COALESCE(m.ended_at, winner_stats.recorded_at, m.created_at) DESC
          LIMIT ${input.limit} OFFSET ${input.offset}
        `);

    const modernCountRaw = hasPlayerFilter
      ? await db.execute(sql`
          SELECT COUNT(*) AS total
          FROM player_match_stats pms
          LEFT JOIN uhc_match m ON m.match_id = pms.match_id
          LEFT JOIN player_web_profile participant ON participant.unique_id = pms.player_uuid
          ${modernWhere}
        `)
      : await db.execute(sql`
          SELECT COUNT(*) AS total
          FROM uhc_match m
          INNER JOIN player_match_stats winner_stats
            ON winner_stats.match_id = m.match_id
            AND winner_stats.player_uuid = (
              SELECT winner_pick.player_uuid
              FROM player_match_stats winner_pick
              WHERE winner_pick.match_id = m.match_id AND winner_pick.wins > 0
              ORDER BY COALESCE(winner_pick.kills, 0) DESC, winner_pick.recorded_at ASC
              LIMIT 1
            )
          ${globalWhere}
        `);

    const modernRows = extractRows<
      Omit<MatchListItem, "modeName" | "timelineEvents" | "winnerInventoryItems" | "winnerInventory"> & {
        playerUuidHex?: string | null;
        timelineRaw?: string | null;
        winningPlayersRaw?: string | null;
        winnerInventoryRaw?: string | null;
      }
    >(modernRowsRaw);
    const luckPermsGroups = await resolveLuckPermsPrimaryGroups(
      modernRows
        .map((row) => (row.playerUuidHex ?? "").toLowerCase())
        .filter((entry) => entry.length === 32),
    );

    const modernItems: MatchListItem[] = modernRows.map((row) => {
      const { playerUuidHex, timelineRaw, winningPlayersRaw, winnerInventoryRaw, ...baseRow } = row;
      const uuidHex = (playerUuidHex ?? "").toLowerCase();
      const fallbackRank = (baseRow.playerRankKey ?? "default").toLowerCase();
      const resolvedRankKey = luckPermsGroups.get(uuidHex) ?? fallbackRank;
      const timelineEvents =
        timelineRaw && timelineRaw.length > 0
          ? timelineRaw
              .split("||")
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0)
              .map((entry) => {
                const [secondsRaw, ...descParts] = entry.split("::");
                const sec = Number(secondsRaw);
                const description = descParts.join("::").trim();
                if (description.length === 0) return null;
                if (!Number.isFinite(sec) || sec < 0) return description;
                const minute = Math.floor(sec / 60);
                const second = sec % 60;
                return `${minute}:${String(second).padStart(2, "0")} ${description}`;
              })
              .filter((entry): entry is string => entry !== null)
          : [];
      const parsedInventory = parseWinnerInventoryRaw(winnerInventoryRaw);
      const winnerInventoryItems = parsedInventory.winnerInventoryItems;
      const winnerInventory = parsedInventory.winnerInventory;
      return {
        ...baseRow,
        modeName: prettifyModeLabel(baseRow.modeSlug),
        modeKey: normalizeModeKey(String(baseRow.modeKey ?? "")),
        isCustomGame: Boolean(baseRow.isCustomGame),
        playedAt: new Date(baseRow.playedAt),
        playerScore: Number(baseRow.playerScore ?? 0),
        playerRankKey: resolvedRankKey,
        playerLevel: baseRow.playerLevel !== null ? Number(baseRow.playerLevel) : null,
        opponentScore: Number(baseRow.opponentScore ?? 0),
        teamSize: baseRow.teamSize !== null ? Number(baseRow.teamSize) : null,
        playersJoined: baseRow.playersJoined !== null ? Number(baseRow.playersJoined) : null,
        matchDurationSeconds: baseRow.matchDurationSeconds !== null ? Number(baseRow.matchDurationSeconds) : null,
        placement: baseRow.placement !== null ? Number(baseRow.placement) : null,
        kills: baseRow.kills !== null ? Number(baseRow.kills) : null,
        damageDealt: baseRow.damageDealt !== null ? Number(baseRow.damageDealt) : null,
        damageTaken: baseRow.damageTaken !== null ? Number(baseRow.damageTaken) : null,
        survivalTimeSeconds: baseRow.survivalTimeSeconds !== null ? Number(baseRow.survivalTimeSeconds) : null,
        totalHealingUsed: baseRow.totalHealingUsed !== null ? Number(baseRow.totalHealingUsed) : null,
        timelineEvents,
        winningTeamPlayers: parseWinningPlayersRaw(winningPlayersRaw),
        winnerInventoryItems,
        winnerInventory,
      };
    });
    const countRows = extractRows<{ total: number }>(modernCountRaw);
    const total = Number(countRows[0]?.total ?? 0);

    return {
      items: modernItems,
      total,
      limit: input.limit,
      offset: input.offset,
      hasMore: input.offset + modernItems.length < total,
      capabilities: MATCH_CAPABILITIES,
    };
  } catch {
    const legacyConditions: SQL<unknown>[] = [];
    let legacyPlayerId = input.playerId;

    if (!legacyPlayerId && playerUsername) {
      const [playerRow] = await db
        .select({ id: players.id })
        .from(players)
        .where(sql`LOWER(${players.username}) = LOWER(${playerUsername})`)
        .limit(1);
      legacyPlayerId = playerRow?.id;
      if (!legacyPlayerId) {
        return emptyMatchResponse(input.limit, input.offset);
      }
    }

    if (legacyPlayerId) legacyConditions.push(eq(matches.playerId, legacyPlayerId));
    if (input.mode) legacyConditions.push(eq(gameModes.slug, input.mode));
    if (input.winsOnly) legacyConditions.push(eq(matches.result, "WIN"));
    if (windowStart) legacyConditions.push(gte(matches.playedAt, windowStart));

    const legacyWhere = legacyConditions.length > 0 ? and(...legacyConditions) : sql`1=1`;

    const rows = await db
      .select({
        id: sql<string>`CAST(${matches.id} AS CHAR)`,
        matchPublicId: sql<string | null>`NULL`,
        playerId: matches.playerId,
        playerUsername: sql<string | null>`(SELECT username FROM players WHERE id = matches.player_id)`,
        playerUuidHex: sql<string | null>`NULL`,
        playerAvatarUrl: sql<string | null>`(SELECT avatar_url FROM players WHERE id = matches.player_id)`,
        playerRankKey: sql<string | null>`NULL`,
        playerLevel: sql<number | null>`NULL`,
        opponentId: matches.opponentId,
        opponentName: matches.opponentName,
        modeSlug: gameModes.slug,
        modeName: gameModes.name,
        modeKey: sql<string>`'unknown'`,
        isCustomGame: sql<number>`0`,
        result: matches.result,
        playerScore: matches.playerScore,
        opponentScore: matches.opponentScore,
        tierChange: matches.tierChange,
        playedAt: matches.playedAt,
        teamSize: sql<number | null>`NULL`,
        playersJoined: sql<number | null>`NULL`,
        matchDurationSeconds: sql<number | null>`NULL`,
        placement: sql<number | null>`NULL`,
        kills: sql<number | null>`NULL`,
        damageDealt: sql<number | null>`NULL`,
        damageTaken: sql<number | null>`NULL`,
        survivalTimeSeconds: sql<number | null>`NULL`,
        kitUsed: sql<string | null>`NULL`,
        bestWeapon: sql<string | null>`NULL`,
        highestArmorTier: sql<string | null>`NULL`,
        totalHealingUsed: sql<number | null>`NULL`,
        finalKillBy: sql<string | null>`NULL`,
        finalDeathBy: sql<string | null>`NULL`,
        winningPlayersRaw: sql<string | null>`NULL`,
        winnerInventoryRaw: sql<string | null>`NULL`,
        timelineRaw: sql<string | null>`NULL`,
      })
      .from(matches)
      .innerJoin(gameModes, eq(matches.modeId, gameModes.id))
      .where(legacyWhere)
      .orderBy(desc(matches.playedAt))
      .limit(input.limit)
      .offset(input.offset);

    const [countRow] = await db
      .select({ total: sql<number>`COUNT(*)` })
      .from(matches)
      .innerJoin(gameModes, eq(matches.modeId, gameModes.id))
      .where(legacyWhere);

    const total = Number(countRow?.total ?? 0);
    const items: MatchListItem[] = rows.map((row) => ({
      ...row,
      modeKey: normalizeModeKey(String(row.modeKey ?? "")),
      isCustomGame: Boolean(row.isCustomGame),
      playedAt: new Date(row.playedAt),
      timelineEvents: [],
      winningTeamPlayers: [],
      winnerInventoryItems: [],
      winnerInventory: null,
    }));

    return {
      items,
      total,
      limit: input.limit,
      offset: input.offset,
      hasMore: input.offset + items.length < total,
      capabilities: MATCH_CAPABILITIES,
    };
  }
}

export const matchRouter = createRouter({
  history: publicQuery
    .input(z.object({
      playerId: z.number().optional(),
      playerUsername: z.string().trim().min(1).max(32).optional(),
      mode: z.string().optional(),
      winsOnly: z.boolean().default(false),
      dateWindow: z.enum(DATE_WINDOW_VALUES).default("all"),
      limit: z.number().min(1).max(50).default(10),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => queryMatchList(input)),

  list: publicQuery
    .input(
      z.object({
        playerId: z.number().optional(),
        playerUsername: z.string().trim().min(1).max(32).optional(),
        mode: z.string().trim().min(1).optional(),
        winsOnly: z.boolean().default(false),
        dateWindow: z.enum(DATE_WINDOW_VALUES).default("all"),
        limit: z.number().min(1).max(50).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input }) => queryMatchList(input)),

  filters: publicQuery.query(async () => {
    const db = getDb();
    try {
      const raw = await db.execute(sql`
        SELECT DISTINCT gamemode_key AS slug
        FROM player_match_stats
        WHERE gamemode_key IS NOT NULL AND gamemode_key <> ''
        ORDER BY gamemode_key ASC
      `);
      const rows = extractRows<{ slug: string }>(raw);
      return {
        modes: rows.map((row) => ({ slug: row.slug, name: prettifyModeLabel(row.slug) })),
        capabilities: MATCH_CAPABILITIES,
        dateWindows: DATE_WINDOW_VALUES,
      };
    } catch {
      const modes = await db.select({ slug: gameModes.slug, name: gameModes.name }).from(gameModes);
      return {
        modes,
        capabilities: MATCH_CAPABILITIES,
        dateWindows: DATE_WINDOW_VALUES,
      };
    }
  }),

  tierHistory: publicQuery
    .input(z.object({
      playerId: z.number(),
      mode: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();

      const query = db
        .select({
          id: tierHistory.id,
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          oldTier: tierHistory.oldTier,
          newTier: tierHistory.newTier,
          changedAt: tierHistory.changedAt,
        })
        .from(tierHistory)
        .innerJoin(gameModes, eq(tierHistory.modeId, gameModes.id))
        .where(eq(tierHistory.playerId, input.playerId))
        .orderBy(desc(tierHistory.changedAt));

      return query;
    }),

  recent: publicQuery
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit ?? 10;

      return db
        .select({
          id: matches.id,
          playerUsername: sql<string>`(SELECT username FROM players WHERE id = matches.player_id)`,
          opponentName: matches.opponentName,
          modeSlug: gameModes.slug,
          modeName: gameModes.name,
          result: matches.result,
          playerScore: matches.playerScore,
          opponentScore: matches.opponentScore,
          playedAt: matches.playedAt,
        })
        .from(matches)
        .innerJoin(gameModes, eq(matches.modeId, gameModes.id))
        .orderBy(desc(matches.playedAt))
        .limit(limit);
    }),
});
