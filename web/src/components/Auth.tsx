import { useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Sign-in-only screen. New sign-ups are disabled server-side in Supabase
 * (Authentication → Providers → Email → "Allow new users to sign up" = off),
 * so this dashboard has exactly one account: the owner's.
 */
export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">goszakup IT radar</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to your dashboard</p>

        <label className="mt-5 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />

        <label className="mt-3 block text-sm font-medium text-slate-700">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
