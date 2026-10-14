export const PRIVATE_REPLY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const MESSAGING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function parseWebhookTimestamp(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && String(value).trim() !== "") {
    return asNumber < 1e12 ? asNumber * 1000 : asNumber;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

export function isWithinWindow(
  timestampMs: number | null | undefined,
  windowMs: number,
  now = Date.now(),
): boolean {
  if (timestampMs == null || Number.isNaN(timestampMs)) return true;
  return now - timestampMs <= windowMs;
}
