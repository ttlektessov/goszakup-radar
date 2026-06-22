import { ALERT_MIN_SCORE, ALERT_MAX_ITEMS } from "./config.js";
import type { Lot } from "./types.js";

/**
 * Telegram alerting. Sends new high-relevance lots to a chat via the Bot API.
 * Gated on TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID; absent → no-op.
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

export const isTelegramConfigured = Boolean(token && chatId);

/** Escapes the five characters that matter in Telegram's HTML parse mode. */
function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendMessage(text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

function formatLot(lot: Lot): string {
  const amount = lot.amount != null ? lot.amount.toLocaleString("ru-RU") + " ₸" : "—";
  const name = htmlEscape(lot.lotName);
  const title = lot.url ? `<a href="${lot.url}">${name}</a>` : name;
  const meta = [amount, lot.customer, lot.status].filter(Boolean).map((s) => htmlEscape(String(s))).join(" · ");
  return `<b>[${lot.relevanceScore}]</b> ${title}\n${meta}`;
}

/**
 * Sends one alert summarizing new lots at or above the score threshold.
 * Returns the number of lots alerted (0 if none qualified or not configured).
 */
export async function sendNewLotAlerts(newLots: Lot[]): Promise<number> {
  if (!isTelegramConfigured) return 0;

  const alertable = newLots
    .filter((l) => l.relevanceScore >= ALERT_MIN_SCORE)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  if (alertable.length === 0) return 0;

  const shown = alertable.slice(0, ALERT_MAX_ITEMS);
  const header = `🆕 <b>${alertable.length} new IT lot${alertable.length === 1 ? "" : "s"}</b>`;
  let text = header + "\n\n" + shown.map(formatLot).join("\n\n");
  if (alertable.length > shown.length) {
    text += `\n\n…and ${alertable.length - shown.length} more — open the dashboard.`;
  }

  await sendMessage(text);
  return alertable.length;
}
