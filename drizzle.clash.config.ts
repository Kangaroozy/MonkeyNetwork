import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.CLASH_DATABASE_URL;
if (!connectionString) {
  throw new Error("CLASH_DATABASE_URL is required to run Clash drizzle commands");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations-clash",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
  tablesFilter: ["clash_%"],
});
