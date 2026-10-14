import { describe, expect, it } from "vitest";
import { parseCommentEvents, parseMessageEvents } from "@/lib/webhook";
import { isWithinWindow, PRIVATE_REPLY_WINDOW_MS, MESSAGING_WINDOW_MS } from "@/lib/windows";

describe("parseCommentEvents", () => {
  it("extracts comments and keeps original media ids for ads", () => {
    const events = parseCommentEvents({
      object: "instagram",
      entry: [
        {
          id: "IG_ME",
          time: 1_700_000_000,
          changes: [
            {
              field: "comments",
              value: {
                id: "COMMENT_1",
                text: "قیمت",
                from: { id: "USER_1", username: "sara" },
                media: { id: "AD_1", original_media_id: "POST_1" },
              },
            },
          ],
        },
      ],
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      commentId: "COMMENT_1",
      commenterId: "USER_1",
      mediaId: "AD_1",
      originalMediaId: "POST_1",
      commentText: "قیمت",
    });
  });
});

describe("parseMessageEvents", () => {
  it("drops echoes and self messages", () => {
    const events = parseMessageEvents({
      object: "instagram",
      entry: [
        {
          id: "IG_ME",
          messaging: [
            {
              sender: { id: "IG_ME" },
              recipient: { id: "USER_1" },
              message: { mid: "m0", text: "echo", is_echo: true },
            },
            {
              sender: { id: "USER_1" },
              recipient: { id: "IG_ME" },
              timestamp: Date.now(),
              message: { mid: "m1", text: "قیمت" },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]?.messageId).toBe("m1");
  });
});

describe("windows", () => {
  it("enforces 7-day private replies and 24-hour DMs", () => {
    const now = Date.now();
    expect(isWithinWindow(now - 6 * 24 * 60 * 60 * 1000, PRIVATE_REPLY_WINDOW_MS, now)).toBe(
      true,
    );
    expect(isWithinWindow(now - 8 * 24 * 60 * 60 * 1000, PRIVATE_REPLY_WINDOW_MS, now)).toBe(
      false,
    );
    expect(isWithinWindow(now - 2 * 60 * 60 * 1000, MESSAGING_WINDOW_MS, now)).toBe(true);
    expect(isWithinWindow(now - 25 * 60 * 60 * 1000, MESSAGING_WINDOW_MS, now)).toBe(false);
    expect(isWithinWindow(null, PRIVATE_REPLY_WINDOW_MS, now)).toBe(true);
  });
});
