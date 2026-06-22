import { BASE_URL, SEARCH_LOTS_PATH, USER_AGENT, PAGE_SIZE } from "./config.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SearchParams {
  /** filter[name] keyword. */
  name?: string;
  /** filter[status][] values. */
  statuses?: readonly string[];
  /** 1-based page number. */
  page?: number;
}

/** Builds the search URL with the site's filter[...] query convention. */
export function buildSearchUrl(params: SearchParams): string {
  const url = new URL(SEARCH_LOTS_PATH, BASE_URL);
  const q = url.searchParams;
  if (params.name) q.set("filter[name]", params.name);
  for (const s of params.statuses ?? []) q.append("filter[status][]", s);
  q.set("count_record", String(PAGE_SIZE));
  if (params.page && params.page > 1) q.set("page", String(params.page));
  return url.toString();
}

/**
 * Fetches a URL as text with a browser User-Agent and simple retry/backoff.
 * Throws after the final attempt so the caller can decide how to handle it.
 */
export async function fetchHtml(url: string, attempt = 1): Promise<string> {
  const MAX_ATTEMPTS = 3;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ru,en;q=0.8",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } catch (err) {
    if (attempt >= MAX_ATTEMPTS) throw err;
    const backoff = 1000 * 2 ** (attempt - 1);
    console.warn(`  fetch failed (attempt ${attempt}): ${(err as Error).message} — retrying in ${backoff}ms`);
    await sleep(backoff);
    return fetchHtml(url, attempt + 1);
  }
}
