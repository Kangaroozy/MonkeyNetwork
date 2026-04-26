require("dotenv").config();
const mysql = require("mysql2/promise");

async function run() {
  const targetName = (process.argv[2] || "").trim();
  if (!targetName) {
    throw new Error("Usage: node scripts/redact-player.cjs <username>");
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [webRows] = await connection.query(
      "SELECT LOWER(HEX(unique_id)) AS uuid FROM player_web_profile WHERE LOWER(player_name) = LOWER(?)",
      [targetName],
    );
    const uuids = Array.isArray(webRows) ? webRows.map((row) => row.uuid).filter(Boolean) : [];

    const [deleteWeb] = await connection.query(
      "DELETE FROM player_web_profile WHERE LOWER(player_name) = LOWER(?)",
      [targetName],
    );

    let legacyRemoved = 0;
    try {
      const [deleteLegacy] = await connection.query(
        "DELETE FROM players WHERE LOWER(username) = LOWER(?)",
        [targetName],
      );
      legacyRemoved = deleteLegacy.affectedRows ?? 0;
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") {
        throw error;
      }
    }

    if (uuids.length > 0) {
      for (const uuidHex of uuids) {
        await connection.query(
          "UPDATE player_profile SET identity_key = CONCAT('redacted_', SUBSTRING(LOWER(HEX(unique_id)), 1, 8)) WHERE unique_id = UNHEX(?)",
          [uuidHex],
        );
      }
    }

    console.log(
      `Redaction complete for '${targetName}'. Removed web profiles: ${deleteWeb.affectedRows ?? 0}, removed legacy players: ${legacyRemoved}.`,
    );
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
