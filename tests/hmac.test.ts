import { describe, expect, it } from "vitest";
import { sha256HmacHex, verifyWebhookSignature } from "@/lib/hmac";

const secret = "test-app-secret";
const body = '{"object":"instagram","entry":[]}';

describe("verifyWebhookSignature", () => {
  it("accepts a valid sha256 HMAC header", () => {
    const header = `sha256=${sha256HmacHex(secret, body)}`;
    expect(verifyWebhookSignature(body, header, secret)).toBe(true);
  });

  it("rejects a tampered payload or secret", () => {
    const header = `sha256=${sha256HmacHex(secret, body)}`;
    expect(verifyWebhookSignature(body + " ", header, secret)).toBe(false);
    expect(verifyWebhookSignature(body, header, "other-secret")).toBe(false);
  });

  it("rejects missing or malformed signatures", () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false);
    expect(verifyWebhookSignature(body, "", secret)).toBe(false);
    expect(verifyWebhookSignature(body, sha256HmacHex(secret, body), secret)).toBe(false);
  });
});
