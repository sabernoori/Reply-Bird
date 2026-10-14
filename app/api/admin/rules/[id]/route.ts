import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { asStringArray, requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import { rules } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const dmText = String(body.dmText ?? "").trim();
  if (!name || !dmText) {
    return NextResponse.json({ error: "name and dmText are required" }, { status: 400 });
  }

  const [row] = await getDb()
    .update(rules)
    .set({
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
      updatedAt: new Date(),
    })
    .where(eq(rules.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ rule: row });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  await getDb().delete(rules).where(eq(rules.id, id));
  return NextResponse.json({ ok: true });
}
