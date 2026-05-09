import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  clashDatabaseUrl: required("CLASH_DATABASE_URL"),
  luckPermsDatabaseUrl: process.env.LUCKPERMS_DATABASE_URL ?? "",
  clanAdminUsernames: process.env.CLAN_ADMIN_USERNAMES ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? "",
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "mn_session",
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS ?? "1209600"),
  clashPluginSyncToken: process.env.CLASH_PLUGIN_SYNC_TOKEN ?? "",
};
