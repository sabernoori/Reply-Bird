import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { asStringArray, requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { rules } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const rows = await getDb().select().from(rules).orderBy(desc(rules.priority), desc(rules.createdAt));
  return NextResponse.json({ rules: rows });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const dmText = String(body.dmText ?? "").trim();
  if (!name || !dmText) {
    return NextResponse.json({ error: "name and dmText are required" }, { status: 400 });
  }

  const [row] = await getDb()
    .insert(rules)
    .values({
      name,
      enabled: body.enabled !== false,
      matchAny: Boolean(body.matchAny),
      keywords: asStringArray(body.keywords),
      mediaId: String(body.mediaId ?? "").trim() || null,
      dmText,
      dmLink: String(body.dmLink ?? "").trim() || null,
      dmButtonTitle: String(body.dmButtonTitle ?? "").trim() || null,
      publicReplies: asStringArray(body.publicReplies),
      replyToDms: Boolean(body.replyToDms),
      priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 0,
    })
    .returning();

  return NextResponse.json({ rule: row }, { status: 201 });
}
