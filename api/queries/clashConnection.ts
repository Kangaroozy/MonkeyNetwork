import { drizzle } from "drizzle-orm/mysql2";
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

export function getClashDb() {
  if (!instance) {
    instance = drizzle(env.clashDatabaseUrl, {
      mode: "planetscale",
      schema: clashSchema,
    });
  }
  return instance;
}
