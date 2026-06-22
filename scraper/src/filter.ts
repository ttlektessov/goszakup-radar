import { RELEVANCE_TERMS } from "./config.js";
import type { Lot } from "./types.js";

/**
 * Scores a lot against the local relevance terms and records which matched.
 * Mutates and returns the lot for convenience.
 */
export function scoreLot(lot: Lot): Lot {
  const haystack = [lot.lotName, lot.announceName ?? "", lot.customer ?? ""]
    .join(" ")
    .toLowerCase();

  let score = 0;
  const matched: string[] = [];
  for (const { pattern, weight } of RELEVANCE_TERMS) {
    if (pattern.test(haystack)) {
      score += weight;
      matched.push(pattern.source);
    }
  }
  lot.relevanceScore = score;
  lot.matchedKeywords = matched;
  return lot;
}
