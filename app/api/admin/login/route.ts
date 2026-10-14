import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  passwordMatches,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } else {
    const form = await request.formData();
    password = String(form.get("password") ?? "");
  }

  if (!passwordMatches(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());
  return response;
}
