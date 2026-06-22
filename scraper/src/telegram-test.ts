import "./env.js";
import { isTelegramConfigured, sendNewLotAlerts } from "./notify.js";
import type { Lot } from "./types.js";

/**
 * Sends a single sample alert so you can confirm the bot delivers to your chat.
 * Run after setting TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID:  npm run telegram:test
 */
const sample: Lot = {
  lotNumber: "TEST-0001",
  announceNumber: "0000000-1",
  announceName: "Тестовое объявление",
  lotName: "Разработка программного обеспечения (тестовое уведомление)",
  customer: "Тестовый заказчик",
  amount: 1234567,
  quantity: 1,
  method: "Открытый конкурс",
  status: "Опубликован",
  announceId: 17226840,
  lotId: null,
  url: "https://www.goszakup.gov.kz/ru/announce/index/17226840",
  relevanceScore: 7,
  matchedKeywords: [],
};

if (!isTelegramConfigured) {
  console.error("Set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in scraper/.env first.");
  process.exitCode = 1;
} else {
  const n = await sendNewLotAlerts([sample]);
  console.log(n > 0 ? "Sent test alert ✅ — check Telegram." : "Nothing sent (check ALERT_MIN_SCORE).");
}
