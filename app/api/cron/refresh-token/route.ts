import { NextRequest, NextResponse } from "next/server";
import { optionalEnv } from "@/lib/env";
import { refreshLongLivedToken } from "@/lib/instagram";
import { logEvent } from "@/lib/log";
import { getAccessToken, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = optionalEnv("CRON_SECRET");
  if (!secret) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const current = await getAccessToken();
    const refreshed = await refreshLongLivedToken(current);
    const expiresAt = new Date(Date.now() + refreshed.expiresIn * 1000).toISOString();
    await setSetting("ig_access_token", refreshed.accessToken);
    await setSetting("ig_token_expires_at", expiresAt);

    await logEvent({
      type: "token.refreshed",
      message: "Long-lived Instagram token refreshed",
      payload: { expiresAt },
    });

    return NextResponse.json({ ok: true, expiresAt });
  } catch (error) {
    await logEvent({
      type: "token.refresh_failed",
      level: "error",
      message: "Instagram token refresh failed",
      payload: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "refresh failed" },
      { status: 500 },
    );
  }
}
