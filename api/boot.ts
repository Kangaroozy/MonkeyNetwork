import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import {
  buildSessionClearCookie,
  buildSessionSetCookie,
  createSessionCookieValue,
  hashPassword,
  parseCookieHeader,
  parseSessionCookieValue,
  verifyPassword,
} from "./lib/session";
import { getClashDb } from "./queries/clashConnection";
import { and, eq, sql } from "drizzle-orm";
import { clashAccounts, clashClanMembers, clashClans, clashEvents } from "@db/schema";

const app = new Hono<{ Bindings: HttpBindings }>();
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BLOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;
const REGISTER_MAX_ATTEMPTS = 5;
type RateLimitEntry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};
const authRateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(req: { header: (name: string) => string | undefined }): string {
  const header =
    req.header("cf-connecting-ip") ??
    req.header("x-forwarded-for") ??
    req.header("x-real-ip") ??
    "";
  const first = header.split(",")[0]?.trim();
  return first || "unknown";
}

function consumeRateLimit(input: {
  key: string;
  limit: number;
  now: number;
  windowMs?: number;
  blockMs?: number;
}) {
  const windowMs = input.windowMs ?? AUTH_WINDOW_MS;
  const blockMs = input.blockMs ?? AUTH_BLOCK_MS;
  const existing = authRateLimitStore.get(input.key);

  if (!existing) {
    authRateLimitStore.set(input.key, {
      count: 1,
      windowStart: input.now,
      blockedUntil: 0,
    });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.blockedUntil > input.now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.blockedUntil - input.now) / 1000)),
    };
  }

  if (input.now - existing.windowStart >= windowMs) {
    existing.count = 1;
    existing.windowStart = input.now;
    existing.blockedUntil = 0;
    authRateLimitStore.set(input.key, existing);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > input.limit) {
    existing.blockedUntil = input.now + blockMs;
    authRateLimitStore.set(input.key, existing);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil(blockMs / 1000)),
    };
  }

  authRateLimitStore.set(input.key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}

function clearRateLimitKey(key: string) {
  authRateLimitStore.delete(key);
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function isAdminUsername(username: string): boolean {
  const allowlist = new Set(
    env.clanAdminUsernames
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  return allowlist.has(normalizeUsername(username));
}

async function buildPluginSyncPayload() {
  const db = getClashDb();
  const [activeEvent] = await db
    .select()
    .from(clashEvents)
    .where(eq(clashEvents.isActive, 1))
    .orderBy(sql`${clashEvents.updatedAt} DESC`)
    .limit(1);
  if (!activeEvent) {
    return {
      version: "1.0",
      event: null,
      lockAt: null,
      maxMembersPerClan: 0,
      clans: [] as Array<{
        name: string;
        king: string | null;
        trim: string;
        material: string;
        color: string;
        members: string[];
      }>,
    };
  }

  const rows = await db
    .select({
      clanId: clashClans.id,
      clanName: clashClans.name,
      trim: clashClans.trim,
      material: clashClans.material,
      color: clashClans.color,
      minecraftName: clashClanMembers.minecraftName,
      isLeader: clashClanMembers.isLeader,
    })
    .from(clashClans)
    .leftJoin(
      clashClanMembers,
      and(eq(clashClanMembers.clanId, clashClans.id), eq(clashClanMembers.eventId, activeEvent.id)),
    )
    .where(and(eq(clashClans.eventId, activeEvent.id), eq(clashClans.reviewStatus, "APPROVED")))
    .orderBy(sql`${clashClans.name} ASC`, sql`${clashClanMembers.createdAt} ASC`);

  const clanMap = new Map<number, {
    name: string;
    trim: string;
    material: string;
    color: string;
    king: string | null;
    members: string[];
  }>();
  for (const row of rows) {
    if (!clanMap.has(row.clanId)) {
      clanMap.set(row.clanId, {
        name: row.clanName,
        trim: row.trim,
        material: row.material,
        color: row.color,
        king: null,
        members: [],
      });
    }
    const target = clanMap.get(row.clanId);
    if (!target || !row.minecraftName) continue;
    target.members.push(row.minecraftName);
    if (row.isLeader === 1) {
      target.king = row.minecraftName;
    }
  }
  return {
    version: "1.0",
    event: {
      id: activeEvent.id,
      slug: activeEvent.slug,
      name: activeEvent.name,
    },
    lockAt: activeEvent.lockAt?.toISOString() ?? null,
    maxMembersPerClan: activeEvent.maxMembersPerClan,
    clans: Array.from(clanMap.values()),
  };
}

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.post("/api/auth/register", async (c) => {
  const now = Date.now();
  const clientIp = getClientIp(c.req);
  const ipLimit = consumeRateLimit({
    key: `register:ip:${clientIp}`,
    limit: REGISTER_MAX_ATTEMPTS,
    now,
  });
  if (!ipLimit.allowed) {
    c.header("Retry-After", String(ipLimit.retryAfterSeconds));
    return c.json({ error: "Too many registration attempts. Please try again later." }, 429);
  }

  const body = await c.req.json().catch(() => null) as
    | { username?: string; password?: string }
    | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  if (username.length < 1 || username.length > 32) {
    return c.json({ error: "Username must be between 1 and 32 characters." }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: "Password must be at least 6 characters." }, 400);
  }
  const db = getClashDb();
  const usernameKey = normalizeUsername(username);
  const [existing] = await db
    .select({ id: clashAccounts.id })
    .from(clashAccounts)
    .where(eq(clashAccounts.usernameKey, usernameKey))
    .limit(1);
  if (existing) {
    return c.json({ error: "That Minecraft username is already registered." }, 409);
  }
  const role = isAdminUsername(username) ? "ADMIN" : "USER";
  const [inserted] = await db
    .insert(clashAccounts)
    .values({
      minecraftUsername: username,
      usernameKey,
      passwordHash: hashPassword(password),
      role,
    })
    .$returningId();
  const accountId = Number(inserted.id);
  c.header(
    "Set-Cookie",
    buildSessionSetCookie(
      createSessionCookieValue({
        accountId,
        minecraftUsername: username,
        role,
      }),
    ),
  );
  return c.json({
    ok: true,
    account: {
      accountId,
      minecraftUsername: username,
      role,
    },
  });
});

app.post("/api/auth/login", async (c) => {
  const now = Date.now();
  const clientIp = getClientIp(c.req);
  const ipKey = `login:ip:${clientIp}`;
  const ipLimit = consumeRateLimit({
    key: ipKey,
    limit: LOGIN_MAX_ATTEMPTS,
    now,
  });
  if (!ipLimit.allowed) {
    c.header("Retry-After", String(ipLimit.retryAfterSeconds));
    return c.json({ error: "Too many login attempts. Please try again later." }, 429);
  }

  const body = await c.req.json().catch(() => null) as
    | { username?: string; password?: string }
    | null;
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  if (username.length < 1 || username.length > 32) {
    return c.json({ error: "Invalid username or password." }, 400);
  }
  const usernameKey = normalizeUsername(username);
  const userKey = `login:user:${usernameKey}`;
  const userLimit = consumeRateLimit({
    key: userKey,
    limit: LOGIN_MAX_ATTEMPTS,
    now,
  });
  if (!userLimit.allowed) {
    c.header("Retry-After", String(userLimit.retryAfterSeconds));
    return c.json({ error: "Too many login attempts. Please try again later." }, 429);
  }

  const db = getClashDb();
  const [account] = await db
    .select()
    .from(clashAccounts)
    .where(eq(clashAccounts.usernameKey, usernameKey))
    .limit(1);
  if (!account || !verifyPassword(password, account.passwordHash)) {
    return c.json({ error: "Invalid username or password." }, 401);
  }
  clearRateLimitKey(ipKey);
  clearRateLimitKey(userKey);
  c.header(
    "Set-Cookie",
    buildSessionSetCookie(
      createSessionCookieValue({
        accountId: account.id,
        minecraftUsername: account.minecraftUsername,
        role: account.role,
      }),
    ),
  );
  return c.json({
    ok: true,
    account: {
      accountId: account.id,
      minecraftUsername: account.minecraftUsername,
      role: account.role,
    },
  });
});

app.post("/api/auth/logout", (c) => {
  c.header("Set-Cookie", buildSessionClearCookie());
  return c.json({ ok: true });
});

app.get("/api/auth/me", async (c) => {
  const cookies = parseCookieHeader(c.req.raw.headers.get("cookie"));
  const session = parseSessionCookieValue(cookies[env.sessionCookieName]);
  const isAdmin = !!session && session.role === "ADMIN";
  return c.json({
    authenticated: !!session,
    isAdmin,
    session: session
      ? {
          accountId: session.accountId,
          minecraftUsername: session.minecraftUsername,
          role: session.role,
          expiresAt: session.expiresAt,
        }
      : null,
  });
});

app.get("/api/clash/sync", async (c) => {
  if (!env.clashPluginSyncToken) {
    return c.json({ error: "Sync token is not configured." }, 503);
  }
  const provided = c.req.header("x-clash-sync-token");
  if (!provided || provided !== env.clashPluginSyncToken) {
    return c.json({ error: "Unauthorized." }, 401);
  }
  const payload = await buildPluginSyncPayload();
  return c.json(payload);
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

const isServerlessRuntime =
  !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
  !!process.env.NETLIFY ||
  !!process.env.VERCEL;

if (env.isProduction && !isServerlessRuntime) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
