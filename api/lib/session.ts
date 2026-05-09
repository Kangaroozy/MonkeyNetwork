import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const ONE_SECOND_MS = 1000;

type SessionPayload = {
  accountId: number;
  minecraftUsername: string;
  role: "USER" | "ADMIN";
  issuedAt: number;
  expiresAt: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string): string {
  return createHmac("sha256", env.appSecret).update(value).digest("base64url");
}

export function createSessionCookieValue(input: {
  accountId: number;
  minecraftUsername: string;
  role: "USER" | "ADMIN";
}): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + env.sessionTtlSeconds * ONE_SECOND_MS;
  const payload: SessionPayload = {
    ...input,
    issuedAt,
    expiresAt,
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseSessionCookieValue(raw: string | null | undefined): SessionPayload | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0 || dot >= raw.length - 1) return null;
  const encodedPayload = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  const expectedSignature = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;
    if (!Number.isFinite(parsed.accountId) || parsed.accountId <= 0) return null;
    if (!parsed.minecraftUsername) return null;
    if (parsed.role !== "USER" && parsed.role !== "ADMIN") return null;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, chunk) => {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (!rawKey || rest.length === 0) return acc;
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

export function buildSessionSetCookie(value: string): string {
  const maxAge = Math.max(0, Math.floor(env.sessionTtlSeconds));
  const secure = env.isProduction ? "; Secure" : "";
  return `${env.sessionCookieName}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function buildSessionClearCookie(): string {
  const secure = env.isProduction ? "; Secure" : "";
  return `${env.sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(derived, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type AuthSession = SessionPayload;
