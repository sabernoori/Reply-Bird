import { graphBaseUrl } from "@/lib/env";

export class InstagramApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`Instagram API ${status}: ${body}`);
    this.name = "InstagramApiError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!response.ok) {
    throw new InstagramApiError(response.status, text.slice(0, 2000));
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export type SendResult = {
  recipient_id?: string;
  message_id?: string;
  id?: string;
};

export type LinkButton = {
  title: string;
  url: string;
};

export async function sendPrivateReply(options: {
  accessToken: string;
  igUserId: string;
  commentId: string;
  text: string;
  button?: LinkButton;
}): Promise<SendResult> {
  const message = options.button
    ? {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: options.text.slice(0, 640),
            buttons: [
              {
                type: "web_url",
                url: options.button.url,
                title: options.button.title.slice(0, 20),
              },
            ],
          },
        },
      }
    : { text: options.text };

  const response = await fetch(`${graphBaseUrl()}/${options.igUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      recipient: { comment_id: options.commentId },
      message,
    }),
  });

  return readJson<SendResult>(response);
}

export async function sendDirectMessage(options: {
  accessToken: string;
  igUserId: string;
  userId: string;
  text: string;
  button?: LinkButton;
}): Promise<SendResult> {
  const message = options.button
    ? {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text: options.text.slice(0, 640),
            buttons: [
              {
                type: "web_url",
                url: options.button.url,
                title: options.button.title.slice(0, 20),
              },
            ],
          },
        },
      }
    : { text: options.text };

  const response = await fetch(`${graphBaseUrl()}/${options.igUserId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({
      recipient: { id: options.userId },
      message,
    }),
  });

  return readJson<SendResult>(response);
}

export async function sendCommentReply(options: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<SendResult> {
  const response = await fetch(`${graphBaseUrl()}/${options.commentId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: JSON.stringify({ message: options.message }),
  });
  return readJson<SendResult>(response);
}

export async function refreshLongLivedToken(token: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const url = new URL(`${graphBaseUrl()}/refresh_access_token`);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const response = await fetch(url);
  const data = await readJson<{ access_token: string; expires_in?: number }>(response);
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 5_184_000,
  };
}

export function pickPublicReply(replies: string[]): string | null {
  const usable = replies.map((item) => item.trim()).filter(Boolean);
  if (usable.length === 0) return null;
  const index = Math.floor(Math.random() * usable.length);
  return usable[index] ?? null;
}

export function buildOutboundText(options: {
  template: string;
  username?: string | null;
  commentText?: string | null;
  link?: string | null;
  includeLinkInText: boolean;
}): string {
  let text = options.template
    .replaceAll("{username}", options.username ? `@${options.username}` : "")
    .replaceAll("{comment}", options.commentText ?? "")
    .trim();

  if (options.includeLinkInText && options.link) {
    text = text.length > 0 ? `${text}\n${options.link}` : options.link;
  }
  return text;
}

export function outboundButton(
  link: string | null | undefined,
  title: string | null | undefined,
): LinkButton | undefined {
  if (!link || !title?.trim()) return undefined;
  return { url: link, title: title.trim() };
}
