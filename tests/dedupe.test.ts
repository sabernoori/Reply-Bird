import { describe, expect, it, vi } from "vitest";
import {
  UniqueViolationError,
  claimOnce,
  isUniqueViolation,
  sendAfterClaim,
} from "@/lib/dedupe";

describe("isUniqueViolation", () => {
  it("detects postgres 23505 and unique-constraint messages", () => {
    expect(isUniqueViolation(new UniqueViolationError())).toBe(true);
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(
      isUniqueViolation(new Error("duplicate key value violates unique constraint")),
    ).toBe(true);
    expect(isUniqueViolation(new Error("connection reset"))).toBe(false);
  });
});

describe("claimOnce + sendAfterClaim", () => {
  it("claims on first insert and treats unique violations as duplicates", async () => {
    const first = await claimOnce(async () => ({ commentId: "c1" }));
    expect(first).toEqual({ status: "claimed", row: { commentId: "c1" } });

    const second = await claimOnce(async () => {
      throw new UniqueViolationError();
    });
    expect(second).toEqual({ status: "duplicate" });
  });

  it("never sends when the unique comment_id was already claimed", async () => {
    const send = vi.fn(async () => {
      throw new Error("should not send");
    });

    const duplicate = await sendAfterClaim({
      claim: async () => "duplicate",
      send,
    });
    expect(duplicate).toBe("duplicate");
    expect(send).not.toHaveBeenCalled();

    const sent = await sendAfterClaim({
      claim: async () => "claimed",
      send: async () => undefined,
    });
    expect(sent).toBe("sent");

    const failed = await sendAfterClaim({
      claim: async () => "claimed",
      send: async () => {
        throw new Error("meta down");
      },
    });
    expect(failed).toBe("failed");
  });
});
