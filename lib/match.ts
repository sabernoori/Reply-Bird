import { normalizeText } from "@/lib/normalize";

export type MatchSource = "comment" | "dm";

export type MatchableRule = {
  id: string;
  name: string;
  enabled: boolean;
  matchAny: boolean;
  keywords: string[];
  mediaId: string | null;
  replyToDms: boolean;
  priority: number;
  createdAt?: Date | string | null;
};

export type MatchInput = {
  text: string;
  source: MatchSource;
  mediaId?: string | null;
  originalMediaId?: string | null;
};

export type MatchResult<T extends MatchableRule = MatchableRule> = {
  rule: T;
  matchedKeyword: string | null;
};

function createdAtMs(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function sortRules(rules: MatchableRule[]): MatchableRule[] {
  return [...rules].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return createdAtMs(a.createdAt) - createdAtMs(b.createdAt);
  });
}

export function ruleAppliesToPost(
  rule: MatchableRule,
  mediaId?: string | null,
  originalMediaId?: string | null,
): boolean {
  if (!rule.mediaId) return true;
  return rule.mediaId === mediaId || rule.mediaId === originalMediaId;
}

export function keywordMatches(text: string, keyword: string): boolean {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedKeyword) return false;
  return normalizedText.includes(normalizedKeyword);
}

export function findMatchingRule<T extends MatchableRule>(
  rules: T[],
  input: MatchInput,
): { rule: T; matchedKeyword: string | null } | null {
  for (const rule of sortRules(rules) as T[]) {
    if (!rule.enabled) continue;
    if (input.source === "dm" && !rule.replyToDms) continue;
    if (input.source === "comment" && !ruleAppliesToPost(rule, input.mediaId, input.originalMediaId)) {
      continue;
    }
    if (rule.matchAny) {
      return { rule, matchedKeyword: null };
    }
    for (const keyword of rule.keywords) {
      if (keywordMatches(input.text, keyword)) {
        return { rule, matchedKeyword: keyword };
      }
    }
  }
  return null;
}
