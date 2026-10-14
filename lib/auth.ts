import { cookies } from "next/headers";
import { sha256HmacHex, safeEqual } from "@/lib/hmac";
import { optionalEnv } from "@/lib/env";

export const ADMIN_COOKIE = "rb_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function signingSecret(): string | undefined {
  return optionalEnv("ADMIN_PASSWORD");
}

export function createSessionToken(now = Date.now()): string {
  const secret = signingSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD is not set");
  const expiresAt = String(now + MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sha256HmacHex(secret, expiresAt)}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  now = Date.now(),
): boolean {
  const secret = signingSecret();
  if (!secret || !token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sha256HmacHex(secret, expiresAt);
  if (!safeEqual(sig, expected)) return false;
  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || exp < now) return false;
  return true;
}

export function passwordMatches(password: string): boolean {
  const expected = signingSecret();
  if (!expected) return false;
  return safeEqual(password, expected);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
