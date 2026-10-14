import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listEvents } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 200);
  const events = await listEvents(Number.isFinite(limit) ? limit : 100);
  return NextResponse.json({ events });
}
