import "./env.js";

/**
 * Helper: prints the chat IDs that have messaged your bot.
 *
 * Setup:
 *   1. Create a bot via @BotFather and put its token in scraper/.env as
 *      TELEGRAM_BOT_TOKEN.
 *   2. Open your bot in Telegram and send it any message (e.g. /start).
 *   3. Run:  npm run telegram:chatid
 *   4. Copy the printed id into scraper/.env as TELEGRAM_CHAT_ID.
 */
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("Set TELEGRAM_BOT_TOKEN in scraper/.env first.");
    process.exitCode = 1;
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
  const data = (await res.json()) as {
    ok: boolean;
    result?: Array<{ message?: { chat?: { id: number; type: string; title?: string; username?: string; first_name?: string } } }>;
  };
  if (!data.ok) {
    console.error("Telegram error:", JSON.stringify(data));
    process.exitCode = 1;
    return;
  }

  const chats = new Map<number, string>();
  for (const u of data.result ?? []) {
    const chat = u.message?.chat;
    if (chat) chats.set(chat.id, `${chat.type} ${chat.title ?? chat.username ?? chat.first_name ?? ""}`.trim());
  }

  if (chats.size === 0) {
    console.log("No messages found. Send your bot a message (e.g. /start), then run this again.");
    return;
  }
  console.log("Chats that have messaged your bot:");
  for (const [id, label] of chats) console.log(`  TELEGRAM_CHAT_ID=${id}   (${label})`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
