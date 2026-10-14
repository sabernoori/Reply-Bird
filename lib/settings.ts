import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { optionalEnv } from "@/lib/env";

export async function getSetting(key: string): Promise<string | undefined> {
  const rows = await getDb()
    .select()
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return rows[0]?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDb()
    .insert(settings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getAccessToken(): Promise<string> {
  const stored = await getSetting("ig_access_token");
  if (stored) return stored;
  const fromEnv = optionalEnv("IG_ACCESS_TOKEN");
  if (!fromEnv) {
    throw new Error("IG_ACCESS_TOKEN is not set in the database or environment");
  }
  try {
    await setSetting("ig_access_token", fromEnv);
  } catch {
    // First request can still send even if the persist fails.
  }
  return fromEnv;
}

export async function getIgUserId(): Promise<string> {
  return (await getSetting("ig_user_id")) ?? optionalEnv("IG_USER_ID") ?? "";
}

export async function getTokenExpiresAt(): Promise<string | undefined> {
  return getSetting("ig_token_expires_at");
}
