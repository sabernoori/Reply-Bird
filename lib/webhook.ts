export type CommentEvent = {
  instagramAccountId: string;
  commentId: string;
  commentText: string;
  commenterId: string;
  commenterName?: string;
  mediaId: string;
  originalMediaId?: string;
  timestampMs: number | null;
};

export type MessageEvent = {
  instagramAccountId: string;
  messageId: string;
  messageText: string;
  senderId: string;
  timestampMs: number | null;
};

type WebhookEntry = {
  id?: string;
  time?: number;
  changes?: Array<{
    field?: string;
    value?: {
      id?: string;
      comment_id?: string;
      text?: string;
      timestamp?: string | number;
      from?: { id?: string; username?: string };
      media?: {
        id?: string;
        original_media_id?: string;
      };
      media_id?: string;
    };
  }>;
  messaging?: Array<{
    sender?: { id?: string };
    recipient?: { id?: string };
    timestamp?: number;
    message?: {
      mid?: string;
      text?: string;
      is_echo?: boolean;
      is_deleted?: boolean;
      is_unsupported?: boolean;
    };
  }>;
};

export type InstagramWebhookPayload = {
  object?: string;
  entry?: WebhookEntry[];
};

export function parseCommentEvents(payload: InstagramWebhookPayload): CommentEvent[] {
  const events: CommentEvent[] = [];
  if (payload.object !== "instagram") return events;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const value = change.value;
      const commentId = value?.id ?? value?.comment_id;
      const mediaId = value?.media?.id ?? value?.media_id;
      const commenterId = value?.from?.id;
      if (!entry.id || !commentId || !mediaId || !commenterId) continue;

      const original =
        value?.media?.original_media_id && value.media.original_media_id !== mediaId
          ? value.media.original_media_id
          : undefined;

      events.push({
        instagramAccountId: entry.id,
        commentId,
        commentText: value?.text ?? "",
        commenterId,
        commenterName: value?.from?.username,
        mediaId,
        originalMediaId: original,
        timestampMs:
          value?.timestamp != null
            ? typeof value.timestamp === "number"
              ? value.timestamp < 1e12
                ? value.timestamp * 1000
                : value.timestamp
              : Date.parse(String(value.timestamp)) ||
                (Number(value.timestamp) < 1e12
                  ? Number(value.timestamp) * 1000
                  : Number(value.timestamp))
            : entry.time != null
              ? entry.time < 1e12
                ? entry.time * 1000
                : entry.time
              : null,
      });
    }
  }

  return events;
}

export function parseMessageEvents(payload: InstagramWebhookPayload): MessageEvent[] {
  const events: MessageEvent[] = [];
  if (payload.object !== "instagram") return events;

  for (const entry of payload.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      const message = messaging.message;
      if (!message) continue;
      if (message.is_echo || message.is_deleted || message.is_unsupported) continue;

      const text = message.text?.trim();
      const messageId = message.mid;
      const senderId = messaging.sender?.id;
      const accountId = entry.id ?? messaging.recipient?.id;
      if (!text || !messageId || !senderId || !accountId) continue;
      if (senderId === accountId) continue;

      events.push({
        instagramAccountId: accountId,
        messageId,
        messageText: text,
        senderId,
        timestampMs:
          messaging.timestamp != null
            ? messaging.timestamp < 1e12
              ? messaging.timestamp * 1000
              : messaging.timestamp
            : entry.time != null
              ? entry.time < 1e12
                ? entry.time * 1000
                : entry.time
              : null,
      });
    }
  }

  return events;
}
