import { NextRequest, NextResponse } from "next/server";
import { optionalEnv } from "@/lib/env";
import { verifyWebhookSignature } from "@/lib/hmac";
import { logEvent } from "@/lib/log";
import { processCommentEvent, processMessageEvent } from "@/lib/process";
import {
  parseCommentEvents,
  parseMessageEvents,
  type InstagramWebhookPayload,
} from "@/lib/webhook";

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const expected = optionalEnv("IG_VERIFY_TOKEN");

  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = optionalEnv("IG_APP_SECRET");

  if (!appSecret || !verifyWebhookSignature(rawBody, signature, appSecret)) {
    await logEvent({
      type: "webhook.signature_failed",
      level: "warning",
      message: "Webhook signature verification failed",
      payload: {
        hadSignature: Boolean(signature),
        bodyLength: rawBody.length,
      },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: InstagramWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as InstagramWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const comments = parseCommentEvents(payload);
  const messages = parseMessageEvents(payload);

  for (const event of comments) {
    try {
      await processCommentEvent(event);
    } catch (error) {
      await logEvent({
        type: "comment.error",
        level: "error",
        message: "Unhandled comment processing error",
        payload: {
          commentId: event.commentId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  for (const event of messages) {
    try {
      await processMessageEvent(event);
    } catch (error) {
      await logEvent({
        type: "message.error",
        level: "error",
        message: "Unhandled DM processing error",
        payload: {
          messageId: event.messageId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return NextResponse.json({ ok: true, comments: comments.length, messages: messages.length });
}
