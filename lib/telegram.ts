import { optionalEnv } from "@/lib/env";

export type LeadReport = {
  source: "comment" | "dm";
  ruleName: string;
  text: string;
  fromId: string;
  fromUsername?: string | null;
  mediaId?: string | null;
  matchedKeyword?: string | null;
};

export function formatLeadReport(lead: LeadReport): string {
  const who = lead.fromUsername ? `@${lead.fromUsername}` : lead.fromId;
  const lines = [
    "ReplyBird lead",
    `Source: ${lead.source}`,
    `Rule: ${lead.ruleName}`,
    `From: ${who}`,
  ];
  if (lead.mediaId) lines.push(`Media: ${lead.mediaId}`);
  if (lead.matchedKeyword) lines.push(`Keyword: ${lead.matchedKeyword}`);
  lines.push(`Text: ${lead.text}`);
  return lines.join("\n");
}

export async function notifyLead(lead: LeadReport): Promise<boolean> {
  const token = optionalEnv("TELEGRAM_BOT_TOKEN");
  const chatId = optionalEnv("TELEGRAM_REPORT_CHAT_ID");
  if (!token || !chatId) return false;

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatLeadReport(lead),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram ${response.status}: ${body.slice(0, 500)}`);
  }
  return true;
}
