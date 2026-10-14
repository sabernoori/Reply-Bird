import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { processedComments, processedMessages, rules } from "@/lib/db/schema";
import { claimOnce } from "@/lib/dedupe";
import { isAutoreplyEnabled, optionalEnv } from "@/lib/env";
import {
  buildOutboundText,
  outboundButton,
  pickPublicReply,
  sendCommentReply,
  sendDirectMessage,
  sendPrivateReply,
} from "@/lib/instagram";
import { logEvent } from "@/lib/log";
import { findMatchingRule } from "@/lib/match";
import { getAccessToken, getIgUserId } from "@/lib/settings";
import { notifyLead } from "@/lib/telegram";
import {
  MESSAGING_WINDOW_MS,
  PRIVATE_REPLY_WINDOW_MS,
  isWithinWindow,
} from "@/lib/windows";
import type { CommentEvent, MessageEvent } from "@/lib/webhook";

function ourAccountId(igUserId: string, eventAccountId: string): string {
  return igUserId || eventAccountId;
}

async function loadRules() {
  return getDb().select().from(rules);
}

export async function processCommentEvent(event: CommentEvent): Promise<void> {
  const igUserId = await getIgUserId();
  const accountId = ourAccountId(igUserId, event.instagramAccountId);

  await logEvent({
    type: "comment.received",
    message: "Comment webhook received",
    payload: {
      commentId: event.commentId,
      mediaId: event.mediaId,
      fromId: event.commenterId,
      text: event.commentText,
    },
  });

  if (event.commenterId === accountId || event.commenterId === optionalEnv("IG_USER_ID")) {
    await logEvent({
      type: "comment.skipped",
      message: "Skipped own-account comment",
      payload: { commentId: event.commentId },
    });
    return;
  }

  if (!isWithinWindow(event.timestampMs, PRIVATE_REPLY_WINDOW_MS)) {
    await claimSkippedComment(event, "expired_7d");
    await logEvent({
      type: "comment.skipped",
      level: "warning",
      message: "Comment is older than the 7-day private-reply window",
      payload: { commentId: event.commentId },
    });
    return;
  }

  const match = findMatchingRule(await loadRules(), {
    text: event.commentText,
    source: "comment",
    mediaId: event.mediaId,
    originalMediaId: event.originalMediaId,
  });

  if (!match) {
    await logEvent({
      type: "comment.skipped",
      message: "No matching rule",
      payload: { commentId: event.commentId, text: event.commentText },
    });
    return;
  }

  const claim = await claimOnce(() =>
    getDb()
      .insert(processedComments)
      .values({
        commentId: event.commentId,
        mediaId: event.mediaId,
        fromId: event.commenterId,
        fromUsername: event.commenterName ?? null,
        commentText: event.commentText,
        ruleId: match.rule.id,
        status: "pending",
      })
      .returning()
      .then((rows) => rows[0]),
  );

  if (claim.status === "duplicate") {
    await logEvent({
      type: "comment.deduped",
      message: "Duplicate comment delivery ignored",
      payload: { commentId: event.commentId },
    });
    return;
  }

  if (!isAutoreplyEnabled()) {
    await markComment(event.commentId, "skipped", "autoreply_disabled");
    await logEvent({
      type: "comment.skipped",
      level: "warning",
      message: "Kill switch on: match logged, nothing sent",
      payload: {
        commentId: event.commentId,
        ruleId: match.rule.id,
        matchedKeyword: match.matchedKeyword,
      },
    });
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const button = outboundButton(match.rule.dmLink, match.rule.dmButtonTitle);
    const text = buildOutboundText({
      template: match.rule.dmText,
      username: event.commenterName,
      commentText: event.commentText,
      link: match.rule.dmLink,
      includeLinkInText: Boolean(match.rule.dmLink) && !button,
    });

    const sent = await sendPrivateReply({
      accessToken,
      igUserId: accountId,
      commentId: event.commentId,
      text,
      button,
    });

    const publicReply = pickPublicReply(match.rule.publicReplies ?? []);
    if (publicReply) {
      try {
        await sendCommentReply({
          accessToken,
          commentId: event.commentId,
          message: publicReply,
        });
      } catch (error) {
        await logEvent({
          type: "comment.public_reply_failed",
          level: "warning",
          message: "Public comment reply failed",
          payload: {
            commentId: event.commentId,
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    }

    await markComment(event.commentId, "sent", null, sent.message_id ?? sent.id ?? null);

    await logEvent({
      type: "comment.sent",
      message: "Private reply sent",
      payload: {
        commentId: event.commentId,
        ruleId: match.rule.id,
        matchedKeyword: match.matchedKeyword,
        messageId: sent.message_id ?? sent.id,
      },
    });

    try {
      await notifyLead({
        source: "comment",
        ruleName: match.rule.name,
        text: event.commentText,
        fromId: event.commenterId,
        fromUsername: event.commenterName,
        mediaId: event.mediaId,
        matchedKeyword: match.matchedKeyword,
      });
    } catch (error) {
      await logEvent({
        type: "telegram.failed",
        level: "warning",
        message: "Telegram lead report failed",
        payload: {
          commentId: event.commentId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } catch (error) {
    await markComment(
      event.commentId,
      "failed",
      error instanceof Error ? error.message.slice(0, 500) : "send_failed",
    );
    await logEvent({
      type: "comment.failed",
      level: "error",
      message: "Private reply failed",
      payload: {
        commentId: event.commentId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function processMessageEvent(event: MessageEvent): Promise<void> {
  const igUserId = await getIgUserId();
  const accountId = ourAccountId(igUserId, event.instagramAccountId);

  await logEvent({
    type: "message.received",
    message: "DM webhook received",
    payload: {
      messageId: event.messageId,
      fromId: event.senderId,
      text: event.messageText,
    },
  });

  if (event.senderId === accountId) return;

  if (!isWithinWindow(event.timestampMs, MESSAGING_WINDOW_MS)) {
    await logEvent({
      type: "message.skipped",
      level: "warning",
      message: "DM is outside the 24-hour messaging window",
      payload: { messageId: event.messageId },
    });
    return;
  }

  const match = findMatchingRule(await loadRules(), {
    text: event.messageText,
    source: "dm",
  });

  if (!match) {
    await logEvent({
      type: "message.skipped",
      message: "No matching DM rule",
      payload: { messageId: event.messageId, text: event.messageText },
    });
    return;
  }

  const claim = await claimOnce(() =>
    getDb()
      .insert(processedMessages)
      .values({
        messageId: event.messageId,
        fromId: event.senderId,
        messageText: event.messageText,
        ruleId: match.rule.id,
        status: "pending",
      })
      .returning()
      .then((rows) => rows[0]),
  );

  if (claim.status === "duplicate") {
    await logEvent({
      type: "message.deduped",
      message: "Duplicate DM delivery ignored",
      payload: { messageId: event.messageId },
    });
    return;
  }

  if (!isAutoreplyEnabled()) {
    await getDb()
      .update(processedMessages)
      .set({ status: "skipped", skipReason: "autoreply_disabled" })
      .where(eq(processedMessages.messageId, event.messageId));
    await logEvent({
      type: "message.skipped",
      level: "warning",
      message: "Kill switch on: DM match logged, nothing sent",
      payload: { messageId: event.messageId, ruleId: match.rule.id },
    });
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const button = outboundButton(match.rule.dmLink, match.rule.dmButtonTitle);
    const text = buildOutboundText({
      template: match.rule.dmText,
      link: match.rule.dmLink,
      includeLinkInText: Boolean(match.rule.dmLink) && !button,
    });

    const sent = await sendDirectMessage({
      accessToken,
      igUserId: accountId,
      userId: event.senderId,
      text,
      button,
    });

    await getDb()
      .update(processedMessages)
      .set({
        status: "sent",
        dmMessageId: sent.message_id ?? sent.id ?? null,
      })
      .where(eq(processedMessages.messageId, event.messageId));

    await logEvent({
      type: "message.sent",
      message: "DM auto-reply sent",
      payload: {
        messageId: event.messageId,
        ruleId: match.rule.id,
        matchedKeyword: match.matchedKeyword,
      },
    });

    try {
      await notifyLead({
        source: "dm",
        ruleName: match.rule.name,
        text: event.messageText,
        fromId: event.senderId,
        matchedKeyword: match.matchedKeyword,
      });
    } catch (error) {
      await logEvent({
        type: "telegram.failed",
        level: "warning",
        message: "Telegram lead report failed",
        payload: {
          messageId: event.messageId,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  } catch (error) {
    await getDb()
      .update(processedMessages)
      .set({
        status: "failed",
        skipReason: error instanceof Error ? error.message.slice(0, 500) : "send_failed",
      })
      .where(eq(processedMessages.messageId, event.messageId));
    await logEvent({
      type: "message.failed",
      level: "error",
      message: "DM auto-reply failed",
      payload: {
        messageId: event.messageId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

async function claimSkippedComment(event: CommentEvent, reason: string) {
  await claimOnce(() =>
    getDb()
      .insert(processedComments)
      .values({
        commentId: event.commentId,
        mediaId: event.mediaId,
        fromId: event.commenterId,
        fromUsername: event.commenterName ?? null,
        commentText: event.commentText,
        status: "skipped",
        skipReason: reason,
      })
      .returning()
      .then((rows) => rows[0]),
  );
}

async function markComment(
  commentId: string,
  status: string,
  skipReason: string | null,
  dmMessageId?: string | null,
) {
  await getDb()
    .update(processedComments)
    .set({
      status,
      skipReason,
      dmMessageId: dmMessageId ?? null,
    })
    .where(eq(processedComments.commentId, commentId));
}
