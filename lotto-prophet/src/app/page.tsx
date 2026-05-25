"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type User = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
};

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");
    if (!token) { router.replace("/signin"); return; }
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { router.replace("/signin"); }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-8">

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{user?.firstname ? `, ${user.firstname}` : ""} 👋
        </h1>
        <p className="text-gray-400 dark:text-gray-500 mt-1 text-sm">Here&apos;s your Lotto Prophet dashboard</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Predictions Made */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Predictions Made</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">0</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total predictions</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#a855f7" strokeWidth="1.8"/>
              <path d="M8 12.5l2.5 2.5 5-5" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3v1M12 20v1M3 12h1M20 12h1" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">—</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">No data yet</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M3 17l4-8 4 5 3-3 4 6" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="3" y="3" width="4" height="4" rx="0.8" fill="#6366f1" opacity="0.3"/>
              <rect x="10" y="3" width="4" height="4" rx="0.8" fill="#6366f1" opacity="0.3"/>
            </svg>
          </div>
        </div>

        {/* Draws Tracked */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Draws Tracked</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">0</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Lotto draws followed</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#8b5cf6" strokeWidth="1.8"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#8b5cf6" strokeWidth="1.8"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#8b5cf6" strokeWidth="1.8"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#8b5cf6" strokeWidth="1.8"/>
            </svg>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Subscription</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">Free</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Current plan</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#f59e0b">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Middle row: Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 mb-8">Your latest predictions and results</p>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No activity yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Start making predictions to see your{" "}
              <Link href="/draws" className="text-indigo-500 hover:underline">history here</Link>
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 flex flex-col">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 mb-6">Get started with Lotto Prophet</p>
          <div className="flex flex-col gap-1 flex-1">
            <Link href="/predictions" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">New Prediction</span>
            </Link>

            <Link href="/draws" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">View Statistics</span>
            </Link>

            <Link href="/draws" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Set Draw Alerts</span>
            </Link>

            <Link href="/university" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="#f59e0b">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Upgrade Plan</span>
            </Link>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right mt-4">Features coming soon</p>
        </div>
      </div>

      {/* Analysis Tools */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Analysis Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/tools/lapping-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Lapping 2</p>
                  <p className="text-xs text-gray-400">2-row pattern analysis</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Scan 2 consecutive rows per column to find overlapping patterns in draw history.
              </p>
            </div>
          </Link>

          <Link href="/tools/lapping-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Lapping 3</p>
                  <p className="text-xs text-gray-400">3-row pattern analysis</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Scan 3 consecutive rows per column with pre-filled default patterns for deeper analysis.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
