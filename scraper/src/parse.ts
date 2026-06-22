import * as cheerio from "cheerio";
import { BASE_URL } from "./config.js";
import type { Lot } from "./types.js";

/** Parses a number from goszakup text like "240 000.00" (space thousands sep). */
function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[\s  ]/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function firstIdFrom(href: string | undefined, re: RegExp): number | null {
  if (!href) return null;
  const m = href.match(re);
  return m && m[1] ? Number(m[1]) : null;
}

/**
 * Parses the #search-result table from a lots search page into Lot records.
 * Relevance fields are left at defaults here; they're filled by scoreLot().
 */
export function parseLots(html: string): Lot[] {
  const $ = cheerio.load(html);
  const rows = $("#search-result tbody tr");
  const lots: Lot[] = [];

  rows.each((_, tr) => {
    const tds = $(tr).find("> td");
    // A valid lot row has all seven columns; skip "no results"/spacer rows.
    if (tds.length < 7) return;

    const lotNumber = $(tds[0]).find("strong").first().text().trim();
    if (!lotNumber) return;

    const announceCell = $(tds[1]);
    const announceLink = announceCell.find("a").first();
    const announceName = announceLink.text().trim() || null;
    const announceHref = announceLink.attr("href");
    const announceId = firstIdFrom(announceHref, /\/announce\/index\/(\d+)/);
    // "<b>Заказчик:</b> РГКП ..." — take the cell text, drop the label.
    const customerRaw = announceCell.find("small").text().replace(/\s+/g, " ").trim();
    const customer = customerRaw.replace(/^Заказчик:\s*/i, "").trim() || null;
    // The announce number is the leading token of the title, e.g. "17229053-1 ...".
    const announceNumber = announceName?.match(/^(\S+)/)?.[1] ?? null;

    const lotCell = $(tds[2]);
    const lotLink = lotCell.find("a").first();
    const lotName = lotLink.text().trim();
    const lotHref = lotLink.attr("href");
    const historyBtn = lotCell.find("[data-lot-id]").first();
    const lotId =
      firstIdFrom(historyBtn.attr("data-lot-id"), /(\d+)/) ??
      firstIdFrom(lotHref, /\/(\d+)$/);

    const quantity = parseAmount($(tds[3]).text());
    const amount = parseAmount($(tds[4]).text());
    const method = $(tds[5]).text().trim() || null;
    const status = $(tds[6]).text().trim() || null;

    const url = lotHref
      ? new URL(lotHref, BASE_URL).toString()
      : announceHref
        ? new URL(announceHref, BASE_URL).toString()
        : null;

    lots.push({
      lotNumber,
      announceNumber,
      announceName,
      lotName: lotName || lotNumber,
      customer,
      amount,
      quantity,
      method,
      status,
      announceId,
      lotId,
      url,
      relevanceScore: 0,
      matchedKeywords: [],
    });
  });

  return lots;
}
