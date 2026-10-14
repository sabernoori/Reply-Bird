/**
 * Insert-before-send claim helper.
 *
 * Duplicate Instagram webhook deliveries must never send twice
 * (openreply #69). Callers insert a unique comment_id / message_id
 * row first; a unique-violation means another delivery already claimed it.
 */

export class UniqueViolationError extends Error {
  readonly code = "23505";

  constructor(message = "unique_violation") {
    super(message);
    this.name = "UniqueViolationError";
  }
}

function readErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const record = error as {
    code?: unknown;
    cause?: { code?: unknown };
    originalError?: { code?: unknown };
  };
  if (typeof record.code === "string") return record.code;
  if (typeof record.cause?.code === "string") return record.cause.code;
  if (typeof record.originalError?.code === "string") {
    return record.originalError.code;
  }
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  if (error instanceof UniqueViolationError) return true;
  if (readErrorCode(error) === "23505") return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /duplicate key value|unique constraint|unique_violation/i.test(message);
}

export type ClaimResult<T> =
  | { status: "claimed"; row: T }
  | { status: "duplicate" };

export async function claimOnce<T>(insert: () => Promise<T>): Promise<ClaimResult<T>> {
  try {
    const row = await insert();
    return { status: "claimed", row };
  } catch (error) {
    if (isUniqueViolation(error)) return { status: "duplicate" };
    throw error;
  }
}

export type SendAfterClaimResult = "sent" | "duplicate" | "failed";

/**
 * Claim the unique id, then send. Send never runs on a duplicate claim.
 */
export async function sendAfterClaim(options: {
  claim: () => Promise<"claimed" | "duplicate">;
  send: () => Promise<void>;
}): Promise<SendAfterClaimResult> {
  const claimed = await options.claim();
  if (claimed === "duplicate") return "duplicate";
  try {
    await options.send();
    return "sent";
  } catch {
    return "failed";
  }
}
