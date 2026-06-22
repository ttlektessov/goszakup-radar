import {
  IT_KEYWORDS,
  OPEN_STATUS_CODES,
  MAX_PAGES_PER_KEYWORD,
  REQUEST_DELAY_MS,
} from "./config.js";
import { buildSearchUrl, fetchHtml } from "./fetch.js";
import { parseLots } from "./parse.js";
import { scoreLot } from "./filter.js";
import type { Lot } from "./types.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pages through one keyword search until a page returns no rows or the cap. */
async function scrapeKeyword(term: string): Promise<Lot[]> {
  const collected: Lot[] = [];
  for (let page = 1; page <= MAX_PAGES_PER_KEYWORD; page++) {
    const url = buildSearchUrl({ name: term, statuses: OPEN_STATUS_CODES, page });
    const html = await fetchHtml(url);
    const lots = parseLots(html);
    if (lots.length === 0) break;
    collected.push(...lots);
    await sleep(REQUEST_DELAY_MS);
    // A short page means we've reached the end of results for this term.
    if (lots.length < 50) break;
  }
  return collected;
}

export interface ScrapeResult {
  lots: Lot[];
  keywordHits: Record<string, number>;
}

/**
 * Runs every IT keyword search, merges and de-duplicates by lot number,
 * scores each lot, and returns them sorted by relevance (then amount).
 */
export async function scrapeAllItLots(): Promise<ScrapeResult> {
  const byLotNumber = new Map<string, Lot>();
  const keywordHits: Record<string, number> = {};

  for (const { term } of IT_KEYWORDS) {
    try {
      const lots = await scrapeKeyword(term);
      keywordHits[term] = lots.length;
      for (const lot of lots) {
        if (!byLotNumber.has(lot.lotNumber)) {
          byLotNumber.set(lot.lotNumber, scoreLot(lot));
        }
      }
      console.log(`  "${term}" → ${lots.length} rows`);
    } catch (err) {
      keywordHits[term] = -1;
      console.error(`  "${term}" FAILED: ${(err as Error).message}`);
    }
  }

  const lots = [...byLotNumber.values()].sort(
    (a, b) => b.relevanceScore - a.relevanceScore || (b.amount ?? 0) - (a.amount ?? 0),
  );
  return { lots, keywordHits };
}
