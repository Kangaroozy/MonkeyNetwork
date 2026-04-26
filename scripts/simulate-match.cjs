require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const winnerName = process.argv[2] || "Kangaroozy";
  const mode = "royale_custom";
  const kit = "trapper";
  const inventory = JSON.stringify({
    version: 2,
    layout: "player_inventory",
    capturedAtEpochMs: Date.now(),
    items: [
      {
        slotKey: "hotbar.0",
        slotIndex: 0,
        material: "DIAMOND_SWORD",
        amount: 1,
        displayName: "Infernal Fang",
        lore: ["Legendary blade forged in UHC fire", "+8 Attack Damage"],
        enchantments: [
          { key: "minecraft:sharpness", level: 5 },
          { key: "minecraft:fire_aspect", level: 2 },
        ],
        customModelData: 2034,
        damage: 0,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: ["civilization:diamond_sword_infernal_fang"],
      },
      {
        slotKey: "hotbar.1",
        slotIndex: 1,
        material: "BOW",
        amount: 1,
        displayName: "Stormcaller Bow",
        lore: ["Pierces armor at long range"],
        enchantments: [
          { key: "minecraft:power", level: 4 },
          { key: "minecraft:infinity", level: 1 },
        ],
        customModelData: 104,
        damage: 7,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: ["civilization:ia_artemis_bow"],
      },
      {
        slotKey: "hotbar.2",
        slotIndex: 2,
        material: "ARROW",
        amount: 42,
        displayName: "Arrow",
        lore: [],
        enchantments: [],
        customModelData: null,
        damage: null,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "hotbar.3",
        slotIndex: 3,
        material: "GOLDEN_APPLE",
        amount: 6,
        displayName: "Golden Apple",
        lore: ["Emergency heal"],
        enchantments: [],
        customModelData: null,
        damage: null,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "hotbar.4",
        slotIndex: 4,
        material: "WATER_BUCKET",
        amount: 1,
        displayName: "Water Bucket",
        lore: [],
        enchantments: [],
        customModelData: null,
        damage: null,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "hotbar.5",
        slotIndex: 5,
        material: "LAVA_BUCKET",
        amount: 1,
        displayName: "Lava Bucket",
        lore: [],
        enchantments: [],
        customModelData: null,
        damage: null,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "armor.helmet",
        slotIndex: 39,
        material: "DIAMOND_HELMET",
        amount: 1,
        displayName: "Diamond Helmet",
        lore: [],
        enchantments: [{ key: "minecraft:protection", level: 4 }],
        customModelData: null,
        damage: 0,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "armor.chestplate",
        slotIndex: 38,
        material: "DIAMOND_CHESTPLATE",
        amount: 1,
        displayName: "Diamond Chestplate",
        lore: [],
        enchantments: [{ key: "minecraft:protection", level: 4 }],
        customModelData: null,
        damage: 0,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "armor.leggings",
        slotIndex: 37,
        material: "DIAMOND_LEGGINGS",
        amount: 1,
        displayName: "Diamond Leggings",
        lore: [],
        enchantments: [{ key: "minecraft:protection", level: 4 }],
        customModelData: null,
        damage: 0,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
      {
        slotKey: "armor.boots",
        slotIndex: 36,
        material: "DIAMOND_BOOTS",
        amount: 1,
        displayName: "Diamond Boots",
        lore: [],
        enchantments: [{ key: "minecraft:protection", level: 4 }],
        customModelData: null,
        damage: 0,
        unbreakable: false,
        itemFlags: [],
        customKeyCandidates: [],
      },
    ],
  });

  await connection.query(
    "ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS damage_dealt INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS damage_taken INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS survival_seconds INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS best_weapon VARCHAR(64) NULL, ADD COLUMN IF NOT EXISTS highest_armor_tier VARCHAR(32) NULL, ADD COLUMN IF NOT EXISTS final_kill_by VARCHAR(32) NULL, ADD COLUMN IF NOT EXISTS final_death_by VARCHAR(32) NULL, ADD COLUMN IF NOT EXISTS total_healing_used INT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS winner_inventory_snapshot TEXT NULL",
  );

  await connection.query(
    "CREATE TABLE IF NOT EXISTS player_match_timeline_event (id BIGINT NOT NULL AUTO_INCREMENT, match_id BINARY(16) NOT NULL, player_uuid BINARY(16) NOT NULL, event_second INT NOT NULL DEFAULT 0, event_type VARCHAR(32) NULL, description VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id), INDEX idx_timeline_player_match (player_uuid, match_id), INDEX idx_timeline_match_player_second (match_id, player_uuid, event_second)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  );

  const winnerId = await resolveOrCreateProfile(connection, winnerName, "owner", 120);
  const [[matchIdRow]] = await connection.query("SELECT UNHEX(REPLACE(UUID(),'-','')) AS id");
  const matchId = matchIdRow.id;

  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - 36 * 60 * 1000 - 33 * 1000);

  await connection.query(
    "INSERT INTO player_web_profile (unique_id, player_name, skin_url, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), skin_url=VALUES(skin_url), updated_at=NOW()",
    [winnerId, winnerName, `https://mc-heads.net/avatar/${encodeURIComponent(winnerName)}`],
  );

  await connection.query(
    "INSERT INTO uhc_match (match_id, host_uuid, state, config_json, assigned_server_id, queue_id, join_token, created_at, lobby_opened_at, game_started_at, ended_at, row_version) VALUES (?, ?, 'ENDED', ?, NULL, ?, NULL, NOW(), NOW(), ?, ?, 0)",
    [matchId, winnerId, JSON.stringify({ teamSize: 1, mapTypeDisplay: "Royale Custom" }), mode, startedAt, endedAt],
  );

  await connection.query(
    "INSERT INTO match_roster (match_id, player_uuid, role, ready_flag, joined_at, connection_status) VALUES (?, ?, 'PLAYER', 1, NOW(), 'CONNECTED')",
    [matchId, winnerId],
  );

  const opponents = ["Steve123", "AlexPvP", "DemonYT"];
  for (const name of opponents) {
    const opponentId = await resolveOrCreateProfile(connection, name, "default", 25);

    await connection.query(
      "INSERT INTO player_web_profile (unique_id, player_name, skin_url, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), skin_url=VALUES(skin_url), updated_at=NOW()",
      [opponentId, name, `https://mc-heads.net/avatar/${encodeURIComponent(name)}`],
    );

    await connection.query(
      "INSERT INTO match_roster (match_id, player_uuid, role, ready_flag, joined_at, connection_status) VALUES (?, ?, 'PLAYER', 1, NOW(), 'CONNECTED')",
      [matchId, opponentId],
    );

    await connection.query(
      "INSERT INTO player_match_stats (match_id, player_uuid, gamemode_key, kit_key, wins, losses, kills, deaths, assists, matches_played, damage_dealt, damage_taken, survival_seconds, best_weapon, highest_armor_tier, final_kill_by, final_death_by, total_healing_used, winner_inventory_snapshot, recorded_at) VALUES (?, ?, ?, 'warrior', 0, 1, ?, 1, 0, 1, ?, ?, ?, 'iron sword', 'iron', NULL, ?, 2, NULL, ?)",
      [
        matchId,
        opponentId,
        mode,
        Math.floor(Math.random() * 3),
        Math.floor(Math.random() * 100) + 20,
        Math.floor(Math.random() * 140) + 40,
        Math.floor(Math.random() * 1800) + 600,
        winnerName,
        endedAt,
      ],
    );
  }

  await connection.query(
    "INSERT INTO player_match_stats (match_id, player_uuid, gamemode_key, kit_key, wins, losses, kills, deaths, assists, matches_played, damage_dealt, damage_taken, survival_seconds, best_weapon, highest_armor_tier, final_kill_by, final_death_by, total_healing_used, winner_inventory_snapshot, recorded_at) VALUES (?, ?, ?, ?, 1, 0, 6, 0, 0, 1, 780, 420, 2193, 'diamond sword', 'diamond', ?, NULL, 8, ?, ?)",
    [matchId, winnerId, mode, kit, "SweatLord", inventory, endedAt],
  );

  const events = [
    [92, "Crafted iron sword"],
    [190, "Killed Steve123"],
    [260, "Entered Nether"],
    [514, "Killed AlexPvP"],
    [1066, "Killed DemonYT"],
    [2193, "Victory"],
  ];
  for (const [eventSecond, description] of events) {
    await connection.query(
      "INSERT INTO player_match_timeline_event (match_id, player_uuid, event_second, event_type, description) VALUES (?, ?, ?, 'GENERAL', ?)",
      [matchId, winnerId, eventSecond, description],
    );
  }

  console.log(`Simulated match created. Winner=${winnerName} matchId=${matchId.toString("hex")}`);
  await connection.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function resolveOrCreateProfile(connection, identityKey, rank, level) {
  const [existingRows] = await connection.query(
    "SELECT unique_id AS uniqueId FROM player_profile WHERE identity_key = ? LIMIT 1",
    [identityKey],
  );
  if (Array.isArray(existingRows) && existingRows.length > 0) {
    return existingRows[0].uniqueId;
  }
  const [[idRow]] = await connection.query("SELECT UNHEX(REPLACE(UUID(),'-','')) AS id");
  const newId = idRow.id;
  await connection.query(
    "INSERT INTO player_profile (unique_id, identity_key, rank, level, exp, updated_at) VALUES (?, ?, ?, ?, 0, NOW())",
    [newId, identityKey, rank, level],
  );
  return newId;
}

