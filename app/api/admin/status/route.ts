import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { eventLog, processedComments, rules } from "@/lib/db/schema";
import { isAutoreplyEnabled, optionalEnv } from "@/lib/env";
import { getTokenExpiresAt } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const db = getDb();
  const [ruleCount] = await db.select({ value: count() }).from(rules);
  const [commentCount] = await db.select({ value: count() }).from(processedComments);
  const [eventCount] = await db.select({ value: count() }).from(eventLog);

  return NextResponse.json({
    autoreplyEnabled: isAutoreplyEnabled(),
    telegramConfigured: Boolean(
      optionalEnv("TELEGRAM_BOT_TOKEN") && optionalEnv("TELEGRAM_REPORT_CHAT_ID"),
    ),
    igUserId: optionalEnv("IG_USER_ID") ?? null,
    tokenExpiresAt: (await getTokenExpiresAt()) ?? null,
    counts: {
      rules: ruleCount?.value ?? 0,
      processedComments: commentCount?.value ?? 0,
      events: eventCount?.value ?? 0,
    },
  });
}
