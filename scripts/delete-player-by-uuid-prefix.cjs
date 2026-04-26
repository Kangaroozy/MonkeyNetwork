require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const prefix = (process.argv[2] || "").trim().toLowerCase();
  if (!prefix) {
    throw new Error("Usage: node scripts/delete-player-by-uuid-prefix.cjs <uuid_prefix>");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const targets = [
      ["player_match_timeline_event", "player_uuid"],
      ["player_match_stats", "player_uuid"],
      ["match_roster", "player_uuid"],
      ["uhc_match", "host_uuid"],
      ["player_web_profile", "unique_id"],
      ["player_profile", "unique_id"],
    ];

    for (const [table, column] of targets) {
      try {
        const [result] = await connection.query(
          `DELETE FROM ${table} WHERE LOWER(HEX(${column})) LIKE ?`,
          [`${prefix}%`],
        );
        console.log(`${table}: ${result.affectedRows ?? 0}`);
      } catch (error) {
        if (error?.code === "ER_NO_SUCH_TABLE") {
          console.log(`${table}: skipped (table missing)`);
          continue;
        }
        throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
