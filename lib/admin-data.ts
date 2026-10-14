import { count, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventLog, processedComments, rules } from "@/lib/db/schema";
import { isAutoreplyEnabled, optionalEnv } from "@/lib/env";
import { listEvents } from "@/lib/log";
import { getTokenExpiresAt } from "@/lib/settings";

export async function loadAdminBundle() {
  const db = getDb();
  const [ruleRows, eventRows, [ruleCount], [commentCount], [eventCount], tokenExpiresAt] =
    await Promise.all([
      db.select().from(rules).orderBy(desc(rules.priority), desc(rules.createdAt)),
      listEvents(100),
      db.select({ value: count() }).from(rules),
      db.select({ value: count() }).from(processedComments),
      db.select({ value: count() }).from(eventLog),
      getTokenExpiresAt(),
    ]);

  return {
    rules: ruleRows,
    events: eventRows.map((row) => ({
      ...row,
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    })),
    status: {
      autoreplyEnabled: isAutoreplyEnabled(),
      telegramConfigured: Boolean(
        optionalEnv("TELEGRAM_BOT_TOKEN") && optionalEnv("TELEGRAM_REPORT_CHAT_ID"),
      ),
      igUserId: optionalEnv("IG_USER_ID") ?? null,
      tokenExpiresAt: tokenExpiresAt ?? null,
      counts: {
        rules: ruleCount?.value ?? 0,
        processedComments: commentCount?.value ?? 0,
        events: eventCount?.value ?? 0,
      },
    },
  };
}
