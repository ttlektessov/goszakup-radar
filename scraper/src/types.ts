/** A single procurement lot parsed from a search result row. */
export interface Lot {
  /** Unique lot number, e.g. "81772929-ЗЦП1". Primary key. */
  lotNumber: string;
  /** Announcement (trd_buy) number text. */
  announceNumber: string | null;
  /** Announcement title. */
  announceName: string | null;
  /** Lot name / description. */
  lotName: string;
  /** Procuring organization. */
  customer: string | null;
  /** Lot amount in tenge. */
  amount: number | null;
  /** Quantity. */
  quantity: number | null;
  /** Procurement method, e.g. "Запрос ценовых предложений". */
  method: string | null;
  /** Status text, e.g. "Опубликован". */
  status: string | null;
  /** Numeric announcement id, from the announce link. */
  announceId: number | null;
  /** Numeric lot id, from the lot link / history button. */
  lotId: number | null;
  /** Absolute URL to the lot/announcement on goszakup. */
  url: string | null;
  /** Relevance score from RELEVANCE_TERMS (higher = more clearly IT). */
  relevanceScore: number;
  /** Which relevance patterns matched, for transparency in the UI. */
  matchedKeywords: string[];
}
