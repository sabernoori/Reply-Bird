import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { optionalEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasDatabase = Boolean(optionalEnv("DATABASE_URL"));
  let database = "skipped";
  if (hasDatabase) {
    try {
      await getDb().execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "error";
    }
  }

  return NextResponse.json({
    ok: database !== "error",
    service: "replybird",
    database,
  });
}
