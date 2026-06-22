import { supabase } from "./supabase";
import type { Lot, LotWithState, UserLotState } from "../types";

/** Fetches all lots plus the current user's triage state and merges them. */
export async function fetchLots(): Promise<LotWithState[]> {
  const [lotsRes, stateRes] = await Promise.all([
    supabase.from("lots").select("*").order("relevance_score", { ascending: false }),
    supabase.from("user_lot_state").select("lot_number, saved, dismissed, notes"),
  ]);

  if (lotsRes.error) throw lotsRes.error;
  if (stateRes.error) throw stateRes.error;

  const stateByLot = new Map<string, UserLotState>(
    (stateRes.data ?? []).map((s) => [s.lot_number, s as UserLotState]),
  );

  return (lotsRes.data as Lot[]).map((lot) => {
    const s = stateByLot.get(lot.lot_number);
    return {
      ...lot,
      saved: s?.saved ?? false,
      dismissed: s?.dismissed ?? false,
      notes: s?.notes ?? null,
    };
  });
}

/** Upserts the current user's triage state for a lot (RLS fills user_id via auth.uid()). */
export async function setLotState(
  userId: string,
  lotNumber: string,
  patch: Partial<Pick<UserLotState, "saved" | "dismissed" | "notes">>,
): Promise<void> {
  const { error } = await supabase.from("user_lot_state").upsert(
    {
      user_id: userId,
      lot_number: lotNumber,
      ...patch,
    },
    { onConflict: "user_id,lot_number" },
  );
  if (error) throw error;
}

/** Latest scrape run, for the freshness indicator. */
export async function fetchLatestRun(): Promise<{ finished_at: string | null; lots_found: number | null } | null> {
  const { data, error } = await supabase
    .from("scrape_runs")
    .select("finished_at, lots_found")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
