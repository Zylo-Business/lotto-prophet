"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPredictions, purchasePrediction, type PublicPrediction } from "@/lib/predictions";

type User = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  subscription_plan?: string;
  subscription_expires_at?: string | null;
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  premium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const quickActions = [
  {
    label: "New Prediction",
    href: "/tools/lapping-2",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </div>
    ),
  },
  {
    label: "View Statistics",
    href: "/draws",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
    ),
  },
  {
    label: "Set Draw Alerts",
    href: "/notifications",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      </div>
    ),
  },
  {
    label: "Upgrade Plan",
    href: "/subscription",
    icon: (
      <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    ),
  },
];

function NumberBall({ n, type }: { n: number; type: "N" | "M" }) {
  return (
    <span className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-xs font-bold ${
      type === "N"
        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    }`}>{n}</span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [predLoading, setPredLoading] = useState(true);
  const [paying, setPaying] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.replace("/signin"); return; }
    try {
      setUser(JSON.parse(stored));
    } catch {
      router.replace("/signin");
      return;
    }
    fetchPredictions()
      .then(setPredictions)
      .catch(() => {})
      .finally(() => setPredLoading(false));
  }, [router]);

  async function handlePay(pred: PublicPrediction) {
    if (paying) return;
    setPaying(pred.id);
    try {
      const unlocked = await purchasePrediction(pred.id);
      setPredictions(prev => prev.map(p => p.id === unlocked.id ? unlocked : p));
    } catch {
      // silently fail — user will see the locked state still
    } finally {
      setPaying(null);
    }
  }


  const plan = user?.subscription_plan || "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  const statCards = [
    {
      label: "Predictions Made",
      value: String(predictions.length),
      sub: "Admin predictions available",
      icon: (
        <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
          <circle cx="18" cy="18" r="16" fill="#EEF2FF" />
          <circle cx="18" cy="18" r="10" fill="#C7D2FE" />
          <circle cx="18" cy="18" r="4" fill="#6366F1" />
          <line x1="18" y1="2" x2="18" y2="8" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="28" x2="18" y2="34" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="18" x2="8" y2="18" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
          <line x1="28" y1="18" x2="34" y2="18" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Win Rate",
      value: "—",
      sub: "No data yet",
      icon: (
        <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
          <rect x="2" y="2" width="32" height="32" rx="6" fill="#F0FDF4" />
          <rect x="7" y="20" width="4" height="10" rx="1" fill="#86EFAC" />
          <rect x="14" y="14" width="4" height="16" rx="1" fill="#4ADE80" />
          <rect x="21" y="8" width="4" height="22" rx="1" fill="#22C55E" />
          <rect x="28" y="16" width="4" height="14" rx="1" fill="#16A34A" />
        </svg>
      ),
    },
    {
      label: "Draws Tracked",
      value: "0",
      sub: "Lotto draws followed",
      icon: (
        <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
          <circle cx="18" cy="18" r="16" fill="#EDE9FE" />
          <ellipse cx="18" cy="22" rx="7" ry="4" fill="#C4B5FD" />
          <ellipse cx="18" cy="18" rx="5" ry="7" fill="#7C3AED" opacity="0.7" />
          <circle cx="18" cy="14" r="3" fill="#5B21B6" />
          <circle cx="16" cy="13" r="1" fill="white" opacity="0.6" />
        </svg>
      ),
    },
    {
      label: "Subscription",
      value: planLabel,
      sub: user?.subscription_expires_at
        ? `Expires ${new Date(user.subscription_expires_at).toLocaleDateString()}`
        : "Current plan",
      icon: (
        <svg viewBox="0 0 36 36" className="w-9 h-9" fill="none">
          <circle cx="18" cy="18" r="16" fill="#FFFBEB" />
          <path d="M18 8l2.5 7h7.5l-6 4.5 2.5 7L18 22l-6.5 4.5 2.5-7-6-4.5h7.5z" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 h-14 flex items-center justify-between">
        <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">Lotto Prophet</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">Dashboard</span>
      </div>

      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstname ?? "…"} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s your Lotto Prophet dashboard</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{s.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {s.label === "Subscription" ? (
                  <span className={`text-base font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>{s.value}</span>
                ) : s.value}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{s.sub}</p>
            </div>
            <div className="shrink-0 ml-3">{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Middle row: Predictions + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Predictions panel */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Latest Predictions</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Admin predictions and recommended numbers</p>
          </div>

          {predLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />)}
            </div>
          ) : predictions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No predictions yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Admin predictions will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-80">
              {predictions.map((p) => {
                const isPaid = p.prediction_type === "paid";
                const locked = !p.is_unlocked;
                let nums: number[] = [];
                let mNums: number[] = [];
                if (!locked) {
                  try { if (p.numbers) nums = JSON.parse(p.numbers); } catch {}
                  try { if (p.machine_numbers) mNums = JSON.parse(p.machine_numbers); } catch {}
                }
                return (
                  <div key={p.id} className={`rounded-lg border p-4 ${locked ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10" : "border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.title}</p>
                          {isPaid && (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${locked ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                              {locked ? `GHS ${Number(p.price).toFixed(2)}` : "Unlocked"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{p.game_name} · {p.draw_date?.slice(0, 10)}</p>
                      </div>
                      {locked && (
                        <button
                          onClick={() => handlePay(p)}
                          disabled={paying === p.id}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                          {paying === p.id ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                          )}
                          {paying === p.id ? "Processing…" : "Click to Pay"}
                        </button>
                      )}
                    </div>
                    {locked ? (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {Array.from({ length: p.numbers_count ?? 5 }, (_, i) => (
                          <span key={i} className="inline-flex w-8 h-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 text-xs font-bold select-none">?</span>
                        ))}
                        <p className="text-xs text-amber-600 dark:text-amber-400 ml-1">Pay GHS {Number(p.price).toFixed(2)} to unlock</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {nums.map((n, i) => <NumberBall key={i} n={n} type="N" />)}
                        {mNums.length > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1 text-xs">machine</span>}
                        {mNums.map((n, i) => <NumberBall key={i} n={n} type="M" />)}
                      </div>
                    )}
                    {p.notes && !locked && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{p.notes}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Get started with Lotto Prophet</p>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                {a.icon}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                  {a.label}
                </span>
                <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-4">Features coming soon</p>
        </div>
      </div>

      {/* Analysis Tools */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Analysis Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/tools/lapping-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Lapping 2</p>
                  <p className="text-xs text-gray-400">2-row pattern analysis</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scan 2 consecutive rows per column to find overlapping patterns in draw history.</p>
            </div>
          </Link>

          <Link href="/tools/lapping-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Lapping 3</p>
                  <p className="text-xs text-gray-400">3-row pattern analysis</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scan 3 consecutive rows per column with pre-filled default patterns for deeper analysis.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  </div>
  );
}
