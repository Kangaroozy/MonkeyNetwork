import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.CLASH_DATABASE_URL);

const statements = [
  `CREATE TABLE IF NOT EXISTS clash_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL,
    name VARCHAR(96) NOT NULL,
    max_members_per_clan INT NOT NULL DEFAULT 10,
    lock_at TIMESTAMP NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY clash_events_slug_unique (slug),
    KEY clash_events_active_idx (is_active)
  )`,
  `CREATE TABLE IF NOT EXISTS clash_clans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    name VARCHAR(64) NOT NULL,
    leader_discord_user_id VARCHAR(32) NULL,
    discord_server_link VARCHAR(255) NULL,
    review_status ENUM('PENDING','APPROVED','DECLINED') NOT NULL DEFAULT 'APPROVED',
    review_decline_reason VARCHAR(255) NULL,
    reviewed_by_account_id VARCHAR(32) NULL,
    reviewed_at TIMESTAMP NULL,
    trim ENUM('SENTRY','VEX','WILD','COAST','DUNE','WAYFINDER','RAISER','SHAPER','HOST','WARD','SILENCE','TIDE','SNOUT','RIB','EYE','SPIRE') NOT NULL DEFAULT 'SENTRY',
    material ENUM('QUARTZ','IRON','NETHERITE','REDSTONE','COPPER','GOLD','EMERALD','DIAMOND','LAPIS','AMETHYST') NOT NULL DEFAULT 'IRON',
    color ENUM('BLACK','DARK_BLUE','DARK_GREEN','DARK_AQUA','DARK_RED','DARK_PURPLE','GOLD','GRAY','DARK_GRAY','BLUE','GREEN','AQUA','RED','LIGHT_PURPLE','YELLOW','WHITE') NOT NULL DEFAULT 'WHITE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY clash_clans_event_name_unique (event_id, name),
    KEY clash_clans_event_leader_idx (event_id, leader_discord_user_id),
    CONSTRAINT clash_clans_event_fk FOREIGN KEY (event_id) REFERENCES clash_events(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS clash_clan_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    clan_id INT NOT NULL,
    discord_user_id VARCHAR(32) NULL,
    discord_username VARCHAR(64) NULL,
    minecraft_name VARCHAR(16) NOT NULL,
    is_leader TINYINT NOT NULL DEFAULT 0,
    source ENUM('PLAYER','ADMIN','PLUGIN_SYNC') NOT NULL DEFAULT 'PLAYER',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY clash_members_event_mcname_unique (event_id, minecraft_name),
    UNIQUE KEY clash_members_event_discord_unique (event_id, discord_user_id),
    UNIQUE KEY clash_members_clan_mcname_unique (clan_id, minecraft_name),
    KEY clash_members_clan_leader_idx (clan_id, is_leader),
    CONSTRAINT clash_members_event_fk FOREIGN KEY (event_id) REFERENCES clash_events(id) ON DELETE CASCADE,
    CONSTRAINT clash_members_clan_fk FOREIGN KEY (clan_id) REFERENCES clash_clans(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS clash_roster_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    clan_id INT NULL,
    actor_discord_user_id VARCHAR(32) NULL,
    actor_display_name VARCHAR(64) NULL,
    action ENUM('CLAN_CREATED','CLAN_UPDATED','CLAN_DELETED','MEMBER_ADDED','MEMBER_REMOVED','MEMBER_MOVED','LEADER_CHANGED','LOCK_UPDATED') NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY clash_audit_event_created_idx (event_id, created_at),
    CONSTRAINT clash_audit_event_fk FOREIGN KEY (event_id) REFERENCES clash_events(id) ON DELETE CASCADE,
    CONSTRAINT clash_audit_clan_fk FOREIGN KEY (clan_id) REFERENCES clash_clans(id) ON DELETE SET NULL
  )`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS color ENUM('BLACK','DARK_BLUE','DARK_GREEN','DARK_AQUA','DARK_RED','DARK_PURPLE','GOLD','GRAY','DARK_GRAY','BLUE','GREEN','AQUA','RED','LIGHT_PURPLE','YELLOW','WHITE')
    NOT NULL DEFAULT 'WHITE' AFTER material`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS discord_server_link VARCHAR(255) NULL AFTER leader_discord_user_id`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS review_status ENUM('PENDING','APPROVED','DECLINED') NOT NULL DEFAULT 'APPROVED' AFTER discord_server_link`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS review_decline_reason VARCHAR(255) NULL AFTER review_status`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS reviewed_by_account_id VARCHAR(32) NULL AFTER review_decline_reason`,
  `ALTER TABLE clash_clans
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP NULL AFTER reviewed_by_account_id`,
  `ALTER TABLE clash_events
    MODIFY COLUMN max_members_per_clan INT NOT NULL DEFAULT 10`,
];

for (const statement of statements) {
  await conn.query(statement);
}

const [rows] = await conn.query("SHOW TABLES LIKE 'clash_%'");
console.log(rows);

await conn.end();
