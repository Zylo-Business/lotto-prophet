"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    title: "Expert Predictions",
    desc: "Admin-curated predictions for every major game — free and premium picks delivered straight to your dashboard.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    title: "Lapping Analysis",
    desc: "Detect repeating number patterns across consecutive draws using our Lapping 2 and Lapping 3 pattern tools.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h11M9 12h11M9 19h6" />
      </svg>
    ),
    bg: "bg-amber-100 dark:bg-amber-900/40",
    title: "Full Draw History",
    desc: "Browse thousands of historical draws across NLA, Alpha, Rush, and more — all in one organised place.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422M12 14v7" />
      </svg>
    ),
    bg: "bg-purple-100 dark:bg-purple-900/40",
    title: "Lotto University",
    desc: "Learn from structured courses on foundation skills, lapping strategies, and AI-assisted game theory.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-4 8a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
    bg: "bg-rose-100 dark:bg-rose-900/40",
    title: "Community",
    desc: "Join groups, share forecasts, and discuss strategies with fellow players in a dedicated community space.",
  },
  {
    icon: (
      <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    bg: "bg-sky-100 dark:bg-sky-900/40",
    title: "Draw Alerts",
    desc: "Get push notifications for upcoming draws and when new predictions are published for your favourite games.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">

      {/* ── Top nav ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.jpeg" alt="Lotto Prophet" width={34} height={34} className="rounded-lg" />
            <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400 hidden sm:block">Lotto Prophet</span>
          </Link>

          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/signin"
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 md:py-28">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Live predictions updated daily
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight max-w-3xl">
          Smarter Lotto<br className="hidden sm:block" />
          <span className="text-indigo-600 dark:text-indigo-400"> Predictions</span>
        </h1>

        <p className="mt-5 text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl">
          Pattern analysis, expert picks, draw history, and a learning platform — everything you need to play smarter, all in one place.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40"
          >
            Create Free Account
          </Link>
          <Link
            href="/signin"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">Free to join · No credit card required</p>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Everything you need to win smarter
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-12 text-sm sm:text-base">
            Built for serious players across Ghana&apos;s major lottery games.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────── */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Ready to start?
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm sm:text-base">
            Join thousands of players using data and patterns to make better picks.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Get Started for Free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-6 px-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <span>© {new Date().getFullYear()} Lotto Prophet. All rights reserved.</span>
          <span className="hidden sm:block">·</span>
          <Link href="/signin" className="hover:text-indigo-500 transition-colors">Sign In</Link>
          <span>·</span>
          <Link href="/signup" className="hover:text-indigo-500 transition-colors">Sign Up</Link>
          <span>·</span>
          <Link href="/contact" className="hover:text-indigo-500 transition-colors">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
