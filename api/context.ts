import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { env } from "./lib/env";
import { parseCookieHeader, parseSessionCookieValue, type AuthSession } from "./lib/session";
import { getClashDb } from "./queries/clashConnection";
import { clashAccounts } from "@db/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  session: AuthSession | null;
  isAdmin: boolean;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const cookies = parseCookieHeader(opts.req.headers.get("cookie"));
  const parsedSession = parseSessionCookieValue(cookies[env.sessionCookieName]);
  if (!parsedSession) {
    return { req: opts.req, resHeaders: opts.resHeaders, session: null, isAdmin: false };
  }

  const db = getClashDb();
  const [account] = await db
    .select({ id: clashAccounts.id, role: clashAccounts.role, minecraftUsername: clashAccounts.minecraftUsername })
    .from(clashAccounts)
    .where(eq(clashAccounts.id, parsedSession.accountId))
    .limit(1);

  if (!account) {
    return { req: opts.req, resHeaders: opts.resHeaders, session: null, isAdmin: false };
  }

  const session: AuthSession = {
    ...parsedSession,
    minecraftUsername: account.minecraftUsername,
    role: account.role,
  };
  const isAdmin = session.role === "ADMIN";
  return { req: opts.req, resHeaders: opts.resHeaders, session, isAdmin };
}
