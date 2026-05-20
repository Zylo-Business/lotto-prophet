"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { fetchAdminStats, type AdminStats } from "@/lib/admin";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DISPLAY_NAMES: Record<string, string> = { lucky: "Lucky Tuesday", alpha: "Alpha Lotto" };
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type LatestDraw = { source: string; latest_event: number };

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, trend }: { label: string; value: number; icon: React.ReactNode; trend?: string }) {
  return (
    <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">{icon}</div>
        {trend && <span className="text-xs font-medium text-green-600 dark:text-green-400">{trend}</span>}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

// ── Add Draw Modal ────────────────────────────────────────────────────────────
function AddDrawModal({ token, onAdded }: { token: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("alpha");
  const [eventNumber, setEventNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [ns, setNs] = useState(["", "", "", "", ""]);
  const [ms, setMs] = useState(["", "", "", "", ""]);
  const [includeMachine, setIncludeMachine] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [latestDraws, setLatestDraws] = useState<LatestDraw[]>([]);

  useEffect(() => {
    if (!open) return;
    axios.get(`${BASE_URL}/api/admin/draws/latest`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setLatestDraws(r.data))
      .catch(() => {});
  }, [open, token]);

  useEffect(() => {
    const match = latestDraws.find(d => d.source === source);
    setEventNumber(match ? String(match.latest_event + 1) : "1");
  }, [source, latestDraws]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    const nNumbers = ns.map(Number);
    const mNumbers = includeMachine ? ms.map(Number) : undefined;
    if (nNumbers.some(n => isNaN(n) || n < 1 || n > 90)) { setError("Draw numbers must be 1–90"); return; }
    if (mNumbers && mNumbers.some(n => isNaN(n) || n < 1 || n > 90)) { setError("Machine numbers must be 1–90"); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/api/admin/draws`,
        { source, event_number: Number(eventNumber), date, n_numbers: nNumbers, m_numbers: mNumbers },
        { headers: { Authorization: `Bearer ${token}` } });
      setSuccess(data.message);
      setNs(["", "", "", "", ""]); setMs(["", "", "", "", ""]);
      onAdded();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to add draw");
    } finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null); setSuccess(null); }}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-800"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Add New Draw
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Draw</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Draw Source</label>
                <div className="flex gap-2">
                  {Object.entries(DISPLAY_NAMES).map(([k, v]) => (
                    <button key={k} type="button" onClick={() => setSource(k)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${source === k ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}
                    >{v}</button>
                  ))}
                </div>
              </div>

              {/* Event + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event #</label>
                  <input type="number" value={eventNumber} onChange={e => setEventNumber(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Draw numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Draw Numbers</label>
                <div className="grid grid-cols-5 gap-2">
                  {ns.map((v, i) => (
                    <input key={i} type="number" min={1} max={90} value={v} required placeholder={`N${i+1}`}
                      onChange={e => { const a = [...ns]; a[i] = e.target.value; setNs(a); }}
                      className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-2.5 text-center text-sm font-mono text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500" />
                  ))}
                </div>
              </div>

              {/* Machine toggle */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="incMachine" checked={includeMachine} onChange={e => setIncludeMachine(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="incMachine" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Include Machine Numbers</label>
              </div>

              {/* Machine numbers */}
              {includeMachine && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Machine Numbers</label>
                  <div className="grid grid-cols-5 gap-2">
                    {ms.map((v, i) => (
                      <input key={i} type="number" min={1} max={90} value={v} required={includeMachine} placeholder={`M${i+1}`}
                        onChange={e => { const a = [...ms]; a[i] = e.target.value; setMs(a); }}
                        className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-2.5 text-center text-sm font-mono text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500" />
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
              {success && <p className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 text-sm text-green-600 dark:text-green-400">{success}</p>}
            </form>
            <div className="flex gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button onClick={handleSubmit as any} disabled={loading}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {loading ? "Adding..." : "Add Draw & Notify Users"}
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
    fetchAdminStats(t).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  if (!token) return null;

  const statCards = stats ? [
    { label: "Total Users", value: stats.users, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: "Total Draws", value: stats.draws, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg> },
    { label: "Courses", value: stats.courses, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" /></svg> },
    { label: "Lessons", value: stats.lessons, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { label: "Community Groups", value: stats.groups, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-4 8a9 9 0 100-18 9 9 0 000 18z" /></svg> },
    { label: "Posts", value: stats.posts, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
    { label: "Push Tokens", value: stats.push_tokens, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
  ] : [];

  const totalDraws = stats?.draws ?? 1;
  const sourceColors = ["bg-indigo-600", "bg-amber-500", "bg-emerald-500", "bg-rose-500"];

  return (
    <>
      {/* Page header */}
      <div className="block items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex">
        <div className="mb-3 sm:mb-0">
          <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Admin</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 dark:text-white font-medium">Overview</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h1>
        </div>
        {token && <AddDrawModal token={token} onAdded={() => fetchAdminStats(token).then(setStats).catch(() => {})} />}
      </div>

      <div className="p-4 space-y-6">
        {/* Stats grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-28 rounded-lg bg-white dark:bg-gray-800 shadow animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {statCards.map(c => <StatCard key={c.label} {...c} />)}
          </div>
        )}

        {/* Bottom section */}
        {stats && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Draws by source */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Draws by Source</h3>
              <div className="space-y-4">
                {stats.draws_by_source.map((d, i) => {
                  const pct = totalDraws > 0 ? Math.round((d.count / totalDraws) * 100) : 0;
                  return (
                    <div key={d.source} className="flex items-center gap-3">
                      <div className="w-32 shrink-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{DISPLAY_NAMES[d.source] ?? d.source}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{d.count.toLocaleString()} draws</p>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div className={`h-2 rounded-full ${sourceColors[i % sourceColors.length]}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                {stats.draws_by_source.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No draws recorded yet.</p>
                )}
              </div>
            </div>

            {/* Quick numbers */}
            <div className="rounded-lg bg-white dark:bg-gray-800 p-6 shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Platform Summary</h3>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  { label: "Avg lessons per course", value: stats.courses > 0 ? (stats.lessons / stats.courses).toFixed(1) : "—" },
                  { label: "Avg posts per group", value: stats.groups > 0 ? (stats.posts / stats.groups).toFixed(1) : "—" },
                  { label: "Push tokens registered", value: stats.push_tokens.toLocaleString() },
                  { label: "Total draw sources", value: stats.draws_by_source.length },
                ].map(row => (
                  <li key={row.label} className="flex items-center justify-between py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{row.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
