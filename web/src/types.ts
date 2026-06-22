/** A row from the `lots` table. */
export interface Lot {
  lot_number: string;
  announce_number: string | null;
  announce_name: string | null;
  lot_name: string;
  customer: string | null;
  amount: number | null;
  quantity: number | null;
  method: string | null;
  status: string | null;
  announce_id: number | null;
  lot_id: number | null;
  url: string | null;
  relevance_score: number;
  matched_keywords: string[];
  first_seen: string;
  last_seen: string;
}

/** A row from `user_lot_state` for the current user. */
export interface UserLotState {
  lot_number: string;
  saved: boolean;
  dismissed: boolean;
  notes: string | null;
}

/** A lot joined with the current user's triage state, for the UI. */
export interface LotWithState extends Lot {
  saved: boolean;
  dismissed: boolean;
  notes: string | null;
}
