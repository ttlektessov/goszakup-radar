export function formatAmount(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("ru-RU") + " ₸";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
}

/** A lot is "new" if first seen within the last 48 hours. */
export function isNew(firstSeen: string): boolean {
  return Date.now() - new Date(firstSeen).getTime() < 48 * 60 * 60 * 1000;
}
