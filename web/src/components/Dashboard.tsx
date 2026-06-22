import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { fetchLots, fetchLatestRun, setLotState } from "../lib/lots";
import { formatAmount, formatDate, isNew, announceUrl } from "../lib/format";
import { extractRegion } from "../lib/region";
import type { LotWithState } from "../types";

type View = "active" | "saved" | "all";
type SortKey = "relevance_score" | "amount" | "first_seen" | "region";

/** A lot plus its derived region. */
type Row = LotWithState & { region: string | null; closed: boolean };

export function Dashboard({ session }: { session: Session }) {
  const userId = session.user.id;
  const [lots, setLots] = useState<LotWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<{ started_at: string; finished_at: string | null; lots_found: number | null } | null>(null);

  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [view, setView] = useState<View>("active");
  const [sortKey, setSortKey] = useState<SortKey>("relevance_score");
  const [region, setRegion] = useState("all");
  const [hideClosed, setHideClosed] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [data, run] = await Promise.all([fetchLots(), fetchLatestRun()]);
        setLots(data);
        setLastRun(run);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function toggle(lotNumber: string, field: "saved" | "dismissed") {
    const current = lots.find((l) => l.lot_number === lotNumber);
    if (!current) return;
    const next = !current[field];
    setLots((prev) => prev.map((l) => (l.lot_number === lotNumber ? { ...l, [field]: next } : l)));
    try {
      await setLotState(userId, lotNumber, { [field]: next });
    } catch (err) {
      setLots((prev) => prev.map((l) => (l.lot_number === lotNumber ? { ...l, [field]: current[field] } : l)));
      setError((err as Error).message);
    }
  }

  // A lot is "closed" if it wasn't refreshed in the most recent scrape.
  const cutoff = lastRun ? Date.parse(lastRun.started_at) : null;

  // Derive region + closed flag once per lot.
  const rows: Row[] = useMemo(
    () =>
      lots.map((l) => ({
        ...l,
        region: extractRegion(l.customer, l.announce_name),
        closed: cutoff != null && Date.parse(l.last_seen) < cutoff,
      })),
    [lots, cutoff],
  );

  const regionOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.region) set.add(r.region);
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((l) => {
      if (hideClosed && l.closed) return false;
      if (view === "saved" && !l.saved) return false;
      if (view === "active" && l.dismissed) return false;
      if (l.relevance_score < minScore) return false;
      if (region !== "all" && l.region !== region) return false;
      if (q) {
        const hay = `${l.lot_name} ${l.announce_name ?? ""} ${l.customer ?? ""} ${l.lot_number}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      if (sortKey === "first_seen") return b.first_seen.localeCompare(a.first_seen);
      if (sortKey === "region") return (a.region ?? "я").localeCompare(b.region ?? "я", "ru");
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return bv - av;
    });
    return out;
  }, [rows, search, minScore, view, sortKey, region, hideClosed]);

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">goszakup IT radar</h1>
            <p className="text-xs text-slate-500">
              {lastRun?.finished_at
                ? `Last updated ${formatDate(lastRun.finished_at)} · ${lots.length} lots tracked`
                : `${lots.length} lots`}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">{session.user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            placeholder="Search lot, customer, number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 text-sm">
            {(["active", "saved", "all"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 capitalize ${view === v ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <label className="text-sm text-slate-600">
            Region{" "}
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="all">All</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Min score{" "}
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {[0, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>
                  {n}+
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Sort by{" "}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="relevance_score">Relevance</option>
              <option value="amount">Amount</option>
              <option value="first_seen">Newest</option>
              <option value="region">Region</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
            Hide closed
          </label>
          <span className="ml-auto text-sm text-slate-500">{filtered.length} shown</span>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Lot</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Region</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.lot_number} className={l.dismissed ? "opacity-50" : ""}>
                    <td className="px-3 py-2 align-top">
                      <span className="inline-flex min-w-7 justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                        {l.relevance_score}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const href = announceUrl(l.announce_id, l.url);
                          return href ? (
                            <a href={href} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:underline">
                              {l.lot_name}
                            </a>
                          ) : (
                            <span className="font-medium text-slate-900">{l.lot_name}</span>
                          );
                        })()}
                        {isNew(l.first_seen) && !l.closed && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">NEW</span>
                        )}
                        {l.closed && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">CLOSED</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {l.lot_number} · {l.method ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-slate-600">{l.customer ?? "—"}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-slate-600">{l.region ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap font-medium text-slate-900">
                      {formatAmount(l.amount)}
                    </td>
                    <td className="px-3 py-2 align-top text-slate-600">{l.status ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap">
                      <button
                        onClick={() => toggle(l.lot_number, "saved")}
                        title="Save"
                        className={`mr-1 rounded-md border px-2 py-1 text-xs ${l.saved ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-300 text-slate-500 hover:bg-slate-100"}`}
                      >
                        {l.saved ? "★ Saved" : "☆ Save"}
                      </button>
                      <button
                        onClick={() => toggle(l.lot_number, "dismissed")}
                        title="Dismiss"
                        className={`rounded-md border px-2 py-1 text-xs ${l.dismissed ? "border-slate-400 bg-slate-100 text-slate-700" : "border-slate-300 text-slate-500 hover:bg-slate-100"}`}
                      >
                        {l.dismissed ? "Undo" : "✕ Dismiss"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                      No lots match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-6 text-center text-xs text-slate-400">
          Independent personal project — not affiliated with or endorsed by goszakup.gov.kz.
          Data sourced from the public procurement portal{" "}
          <a href="https://www.goszakup.gov.kz" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">
            goszakup.gov.kz
          </a>
          .
        </footer>
      </main>
    </div>
  );
}
