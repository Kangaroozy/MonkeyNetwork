import mysql from "mysql2/promise";
import { env } from "../lib/env";

let pool: mysql.Pool | null = null;

function getPool() {
  if (!env.luckPermsDatabaseUrl) {
    return null;
  }
  if (!pool) {
    pool = mysql.createPool({
      uri: env.luckPermsDatabaseUrl,
      connectionLimit: 4,
      waitForConnections: true,
    });
  }
  return pool;
}

function normalizeUuidHex(value: string): string {
  return value.replace(/-/g, "").trim().toLowerCase();
}

export async function resolveLuckPermsPrimaryGroups(
  uuidHexList: string[],
): Promise<Map<string, string>> {
  const db = getPool();
  if (!db || uuidHexList.length === 0) {
    return new Map();
  }

  const normalized = Array.from(
    new Set(
      uuidHexList
        .map((entry) => normalizeUuidHex(entry))
        .filter((entry) => entry.length === 32),
    ),
  );
  if (normalized.length === 0) {
    return new Map();
  }

  const placeholders = normalized.map(() => "?").join(", ");
  const [rows] = await db.query<mysql.RowDataPacket[]>(
    `
      SELECT
        LOWER(REPLACE(uuid, '-', '')) AS uuidHex,
        LOWER(TRIM(primary_group)) AS primaryGroup
      FROM luckperms_players
      WHERE REPLACE(uuid, '-', '') IN (${placeholders})
    `,
    normalized,
  );

  const output = new Map<string, string>();
  for (const row of rows) {
    const uuidHex = typeof row.uuidHex === "string" ? normalizeUuidHex(row.uuidHex) : "";
    const primaryGroup = typeof row.primaryGroup === "string" ? row.primaryGroup.trim().toLowerCase() : "";
    if (uuidHex.length === 32 && primaryGroup.length > 0) {
      output.set(uuidHex, primaryGroup);
    }
  }
  return output;
}
