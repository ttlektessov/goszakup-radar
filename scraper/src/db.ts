import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Lot } from "./types.js";

/**
 * Supabase persistence layer for the scraper.
 *
 * Uses the SERVICE-ROLE key (server-side only — bypasses RLS) so the scraper
 * can write to `lots` and `scrape_runs`. If the env vars are absent, the
 * scraper still runs in print-only mode.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isConfigured = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    if (!isConfigured) throw new Error("Supabase env vars are not set");
    client = createClient(url!, serviceKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

/** Maps a Lot to the `lots` row shape. `first_seen` is intentionally omitted
 *  so it keeps its original value on update and uses the column default on insert. */
function toRow(lot: Lot) {
  return {
    lot_number: lot.lotNumber,
    announce_number: lot.announceNumber,
    announce_name: lot.announceName,
    lot_name: lot.lotName,
    customer: lot.customer,
    amount: lot.amount,
    quantity: lot.quantity,
    method: lot.method,
    status: lot.status,
    announce_id: lot.announceId,
    lot_id: lot.lotId,
    url: lot.url,
    relevance_score: lot.relevanceScore,
    matched_keywords: lot.matchedKeywords,
    last_seen: new Date().toISOString(),
  };
}

/** Inserts a scrape_runs row and returns its id. */
export async function startScrapeRun(): Promise<number> {
  const { data, error } = await db()
    .from("scrape_runs")
    .insert({})
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

export async function finishScrapeRun(
  id: number,
  fields: { lotsFound: number; newLots: number; error?: string | null },
): Promise<void> {
  const { error } = await db()
    .from("scrape_runs")
    .update({
      finished_at: new Date().toISOString(),
      lots_found: fields.lotsFound,
      new_lots: fields.newLots,
      error: fields.error ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Upserts lots by lot_number and reports how many were new vs. already seen.
 * Counts new rows by checking which lot_numbers already existed before writing.
 */
export async function upsertLots(lots: Lot[]): Promise<{ newLots: number; total: number }> {
  if (lots.length === 0) return { newLots: 0, total: 0 };

  const numbers = lots.map((l) => l.lotNumber);
  const { data: existing, error: selErr } = await db()
    .from("lots")
    .select("lot_number")
    .in("lot_number", numbers);
  if (selErr) throw selErr;
  const existingSet = new Set((existing ?? []).map((r) => r.lot_number as string));
  const newLots = lots.filter((l) => !existingSet.has(l.lotNumber)).length;

  // Upsert in chunks to stay well under request-size limits.
  const CHUNK = 500;
  for (let i = 0; i < lots.length; i += CHUNK) {
    const rows = lots.slice(i, i + CHUNK).map(toRow);
    const { error } = await db().from("lots").upsert(rows, { onConflict: "lot_number" });
    if (error) throw error;
  }

  return { newLots, total: lots.length };
}
