import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventLog } from "@/lib/db/schema";

export async function logEvent(options: {
  type: string;
  message: string;
  level?: "info" | "warning" | "error";
  payload?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await getDb()
      .insert(eventLog)
      .values({
        type: options.type,
        level: options.level ?? "info",
        message: options.message,
        payload: options.payload ?? null,
      });
  } catch (error) {
    console.error("failed to write event_log", error);
  }
}

export async function listEvents(limit = 100) {
  return getDb()
    .select()
    .from(eventLog)
    .orderBy(desc(eventLog.createdAt))
    .limit(limit);
}
