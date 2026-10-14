import { describe, expect, it } from "vitest";
import { normalizeText } from "@/lib/normalize";

describe("normalizeText", () => {
  it("maps Arabic Yeh and Kaf to Persian forms", () => {
    expect(normalizeText("قيمت")).toBe(normalizeText("قیمت"));
    expect(normalizeText("كليد")).toBe(normalizeText("کلید"));
  });

  it("strips diacritics, ZWNJ, and tatweel", () => {
    expect(normalizeText("قِیمت")).toBe("قیمت");
    expect(normalizeText("قی\u200Cمت")).toBe("قیمت");
    expect(normalizeText("قــیمت")).toBe("قیمت");
  });

  it("converts Persian and Arabic-Indic digits to ASCII", () => {
    expect(normalizeText("قیمت ۱۲۳")).toBe("قیمت 123");
    expect(normalizeText("سعر ٤٥")).toBe("سعر 45");
  });

  it("is case-insensitive for Latin", () => {
    expect(normalizeText("LiNk")).toBe("link");
  });

  it("collapses whitespace and handles empty input", () => {
    expect(normalizeText("  LINK   please  ")).toBe("link please");
    expect(normalizeText("")).toBe("");
    expect(normalizeText(null)).toBe("");
  });
});
