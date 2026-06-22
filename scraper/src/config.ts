/**
 * Scraper configuration: target site, statuses to track, and the IT keyword set.
 */

export const BASE_URL = "https://www.goszakup.gov.kz";
export const SEARCH_LOTS_PATH = "/ru/search/lots";

/**
 * Lot statuses that mean "still open — you can apply".
 * Values come from the filter[status][] <select> on the search page:
 *   210 Опубликован
 *   220 Опубликован (прием заявок)
 *   230 Опубликован (дополнение заявок)
 *   240 Опубликован (прием ценовых предложений)
 */
export const OPEN_STATUS_CODES = ["210", "220", "230", "240"] as const;

/** Page size for each search request (the form's count_record option). */
export const PAGE_SIZE = 50;

/** Hard cap on pages per keyword query, so a broad term can't run away. */
export const MAX_PAGES_PER_KEYWORD = 20;

/**
 * Politeness delay between HTTP requests, in milliseconds.
 * goszakup's robots.txt requests `Crawl-delay: 5`, so we honour 5 seconds.
 */
export const REQUEST_DELAY_MS = 5000;

/**
 * IT keyword queries pushed to the server via filter[name].
 * The site does morphological matching, so a stem like "программн" catches
 * программное / программный / программного, etc. Each entry becomes one
 * server-side search; results are merged and de-duplicated by lot number.
 *
 * `weight` feeds the relevance score — strong, unambiguous IT terms score higher
 * than broad ones that can produce false positives (e.g. "лицензия").
 */
export interface KeywordQuery {
  term: string;
  weight: number;
}

export const IT_KEYWORDS: KeywordQuery[] = [
  { term: "программное обеспечение", weight: 5 },
  { term: "информационная система", weight: 5 },
  { term: "разработка сайта", weight: 5 },
  { term: "веб-сайт", weight: 4 },
  { term: "разработка программного", weight: 5 },
  { term: "сопровождение информационной", weight: 4 },
  { term: "техническая поддержка", weight: 3 },
  { term: "автоматизация", weight: 3 },
  { term: "база данных", weight: 4 },
  { term: "система управления", weight: 2 },
  { term: "сервер", weight: 3 },
  { term: "лицензия на программное", weight: 4 },
  { term: "1С", weight: 4 },
  { term: "компьютерное оборудование", weight: 3 },
  { term: "информационно-коммуникационн", weight: 4 },
  { term: "интеграция", weight: 2 },
  { term: "мобильное приложение", weight: 5 },
];

/**
 * Local relevance signals scored against the combined lot + announcement text
 * after fetching. These reward clearly-IT lots and let us flag-but-not-trust
 * borderline ones. Stored lowercase; matched as substrings.
 */
export const RELEVANCE_TERMS: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /программн/i, weight: 3 },
  { pattern: /информацион/i, weight: 2 },
  { pattern: /разработк/i, weight: 2 },
  { pattern: /веб|web|сайт/i, weight: 3 },
  { pattern: /сервер|server/i, weight: 2 },
  { pattern: /база данных|субд/i, weight: 2 },
  { pattern: /автоматизац/i, weight: 2 },
  { pattern: /приложени/i, weight: 2 },
  { pattern: /\bпо\b|software|softwar/i, weight: 1 },
  { pattern: /лиценз/i, weight: 1 },
  { pattern: /компьютер/i, weight: 1 },
  { pattern: /it[- ]|айти|ит[- ]услуг/i, weight: 2 },
];

/** Only new lots scoring at least this much trigger a Telegram alert. */
export const ALERT_MIN_SCORE = 4;

/** Max lots listed in one alert message; the rest are summarized as "+N more". */
export const ALERT_MAX_ITEMS = 10;

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36";
