import { useSession } from "./hooks/useSession";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";

export default function App() {
  const { session, loading } = useSession();

  if (loading) {
    return <div className="grid min-h-full place-items-center text-slate-400">Loading…</div>;
  }
  return session ? <Dashboard session={session} /> : <Auth />;
}
