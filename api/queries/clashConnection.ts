import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import { env } from "../lib/env";
import * as schema from "@db/schema";

const clashSchema = {
  clashAccounts: schema.clashAccounts,
  clashEvents: schema.clashEvents,
  clashClans: schema.clashClans,
  clashClanMembers: schema.clashClanMembers,
  clashRosterAudit: schema.clashRosterAudit,
};

let instance: ReturnType<typeof drizzle<typeof clashSchema>>;
let schemaEnsurePromise: Promise<void> | null = null;

function isDuplicateColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return (
    code === "ER_DUP_FIELDNAME" ||
    (typeof message === "string" && message.toLowerCase().includes("duplicate column name"))
  );
}

function isAlterIfNotExistsSyntaxError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : "";
  const message = "message" in error ? error.message : "";
  return (
    code === "ER_PARSE_ERROR" ||
    (typeof message === "string" && message.toLowerCase().includes("if not exists"))
  );
}

export function getClashDb() {
  if (!instance) {
    instance = drizzle(env.clashDatabaseUrl, {
      mode: "planetscale",
      schema: clashSchema,
    });
  }
  return instance;
}

export async function ensureClashSchemaCompatibility() {
  if (schemaEnsurePromise) {
    await schemaEnsurePromise;
    return;
  }
  const db = getClashDb();
  schemaEnsurePromise = (async () => {
    try {
      await db.execute(
        sql`ALTER TABLE clash_events ADD COLUMN IF NOT EXISTS min_members_per_clan INT NOT NULL DEFAULT 8`,
      );
      return;
    } catch (error) {
      if (isAlterIfNotExistsSyntaxError(error)) {
        try {
          await db.execute(sql`ALTER TABLE clash_events ADD COLUMN min_members_per_clan INT NOT NULL DEFAULT 8`);
          return;
        } catch (fallbackError) {
          if (!isDuplicateColumnError(fallbackError)) {
            throw fallbackError;
          }
          return;
        }
      }
      if (!isDuplicateColumnError(error)) {
        throw error;
      }
    }
  })();
  try {
    await schemaEnsurePromise;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
}
