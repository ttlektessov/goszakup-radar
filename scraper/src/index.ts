import "./env.js"; // must be first: populates process.env before db.js evaluates
import { scrapeAllItLots } from "./scrape.js";
import { isConfigured, startScrapeRun, finishScrapeRun, upsertLots } from "./db.js";
import { isTelegramConfigured, sendNewLotAlerts } from "./notify.js";

/**
 * Scrapes open IT lots, prints a summary, and (when Supabase is configured)
 * persists them with new-vs-seen tracking.
 */
async function main() {
  const startedAt = Date.now();
  console.log("Scraping goszakup for open IT lots…\n");

  const { lots, keywordHits } = await scrapeAllItLots();

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Found ${lots.length} unique open IT lots in ${((Date.now() - startedAt) / 1000).toFixed(1)}s\n`);

  const top = lots.slice(0, 25);
  for (const lot of top) {
    const amount = lot.amount != null ? lot.amount.toLocaleString("ru-RU") + " ₸" : "—";
    console.log(`[score ${lot.relevanceScore}] ${lot.lotNumber}  ${amount}`);
    console.log(`   ${lot.lotName}`);
    console.log(`   Заказчик: ${lot.customer ?? "—"} | ${lot.status ?? "—"} | ${lot.method ?? "—"}`);
    if (lot.url) console.log(`   ${lot.url}`);
    console.log();
  }
  if (lots.length > top.length) console.log(`… and ${lots.length - top.length} more.\n`);

  const failed = Object.entries(keywordHits).filter(([, n]) => n === -1);
  if (failed.length) {
    console.warn(`Warning: ${failed.length} keyword search(es) failed: ${failed.map(([k]) => k).join(", ")}`);
  }

  // Self-check: if nothing parsed at all, the page markup likely changed.
  if (lots.length === 0) {
    console.error("No lots parsed — the site markup may have changed, or requests were blocked.");
    process.exitCode = 1;
    return;
  }

  // Persist when configured; otherwise stay print-only.
  if (!isConfigured) {
    console.log("Supabase not configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to persist). Print-only run.");
    return;
  }

  let runId: number | null = null;
  try {
    runId = await startScrapeRun();
    const { newLots, total } = await upsertLots(lots);
    await finishScrapeRun(runId, { lotsFound: total, newLots: newLots.length });
    console.log(`Saved to Supabase: ${total} lots (${newLots.length} new, ${total - newLots.length} updated).`);

    // Alert on new lots (non-fatal — persistence already succeeded).
    if (isTelegramConfigured) {
      try {
        const alerted = await sendNewLotAlerts(newLots);
        console.log(alerted > 0 ? `Telegram: alerted ${alerted} new lot(s).` : "Telegram: no new lots above threshold.");
      } catch (err) {
        console.error("Telegram alert failed:", (err as Error).message);
      }
    }
  } catch (err) {
    const message = (err as Error).message;
    console.error("Persistence failed:", message);
    if (runId != null) {
      try {
        await finishScrapeRun(runId, { lotsFound: lots.length, newLots: 0, error: message });
      } catch {
        /* best-effort */
      }
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 1;
});
