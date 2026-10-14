import { createHmac, timingSafeEqual } from "node:crypto";

function toBuffer(value: string): Buffer {
  return Buffer.from(value, "utf8");
}

/**
 * Compare two strings in constant time. Length mismatches still use
 * timingSafeEqual on a dummy buffer so the branch is not a timing oracle.
 */
export function safeEqual(a: string, b: string): boolean {
  const left = toBuffer(a);
  const right = toBuffer(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

export function sha256HmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Verify Meta's X-Hub-Signature-256 header against the raw request body.
 * Expected format: sha256=<hex>
 */
export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const expected = `sha256=${sha256HmacHex(appSecret, payload)}`;
  return safeEqual(signatureHeader, expected);
}
