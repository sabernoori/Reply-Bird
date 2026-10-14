import { describe, expect, it } from "vitest";
import { findMatchingRule, keywordMatches, type MatchableRule } from "@/lib/match";

function rule(partial: Partial<MatchableRule> & Pick<MatchableRule, "id" | "name">): MatchableRule {
  return {
    enabled: true,
    matchAny: false,
    keywords: [],
    mediaId: null,
    replyToDms: false,
    priority: 0,
    ...partial,
  };
}

describe("keywordMatches", () => {
  it("matches keywords after Persian/Arabic normalization", () => {
    expect(keywordMatches("قــیمت طلا", "قيمت")).toBe(true);
    expect(keywordMatches("send LINK please", "link")).toBe(true);
    expect(keywordMatches("hello", "link")).toBe(false);
  });
});

describe("findMatchingRule", () => {
  const price = rule({
    id: "1",
    name: "price",
    keywords: ["قیمت", "price"],
    priority: 10,
  });
  const any = rule({
    id: "2",
    name: "any",
    matchAny: true,
    priority: 1,
  });
  const scoped = rule({
    id: "3",
    name: "reel",
    keywords: ["link"],
    mediaId: "MEDIA_1",
    priority: 50,
  });
  const dm = rule({
    id: "4",
    name: "dm",
    keywords: ["قیمت"],
    replyToDms: true,
    priority: 20,
  });

  it("matches a comment keyword and prefers higher priority", () => {
    const result = findMatchingRule([any, price], {
      text: "قیمت چند؟",
      source: "comment",
      mediaId: "abc",
    });
    expect(result?.rule.id).toBe("1");
    expect(result?.matchedKeyword).toBe("قیمت");
  });

  it("uses the any-comment rule when no keyword hits", () => {
    const result = findMatchingRule([price, any], {
      text: "nice shot",
      source: "comment",
      mediaId: "abc",
    });
    expect(result?.rule.id).toBe("2");
    expect(result?.matchedKeyword).toBeNull();
  });

  it("respects per-post scope, including original ad media id", () => {
    expect(
      findMatchingRule([scoped], {
        text: "link",
        source: "comment",
        mediaId: "OTHER",
      }),
    ).toBeNull();

    expect(
      findMatchingRule([scoped], {
        text: "link",
        source: "comment",
        mediaId: "MEDIA_1",
      })?.rule.id,
    ).toBe("3");

    expect(
      findMatchingRule([scoped], {
        text: "link",
        source: "comment",
        mediaId: "AD_COPY",
        originalMediaId: "MEDIA_1",
      })?.rule.id,
    ).toBe("3");
  });

  it("ignores disabled rules and skips DM source unless replyToDms", () => {
    expect(
      findMatchingRule([rule({ ...price, enabled: false })], {
        text: "price",
        source: "comment",
      }),
    ).toBeNull();

    expect(
      findMatchingRule([price], {
        text: "قیمت",
        source: "dm",
      }),
    ).toBeNull();

    expect(
      findMatchingRule([dm], {
        text: "قيمت",
        source: "dm",
      })?.rule.id,
    ).toBe("4");
  });
});
