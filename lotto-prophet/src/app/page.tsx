"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useRef } from "react";

function DigitRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FONT_SIZE = 15;
    const DIGITS = "0123456789";
    const STREAM_COUNT = 45;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    interface Stream {
      x: number;
      head: number;
      length: number;
      speed: number;
      chars: string[];
      brightness: number;
    }

    const makeStream = (forcedX?: number): Stream => ({
      x: forcedX ?? Math.floor(Math.random() * Math.floor(width / FONT_SIZE)) * FONT_SIZE,
      head: Math.floor(Math.random() * -(height / FONT_SIZE)),
      length: Math.floor(Math.random() * 16 + 8),
      speed: Math.random() * 0.5 + 0.25,
      chars: [],
      brightness: Math.random() * 0.13 + 0.04,
    });

    const streams: Stream[] = Array.from({ length: STREAM_COUNT }, (_, i) =>
      makeStream(Math.floor((i / STREAM_COUNT) * width))
    );

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.font = `bold ${FONT_SIZE}px monospace`;

      for (const stream of streams) {
        if (frame % Math.max(1, Math.ceil(1 / stream.speed)) === 0) {
          stream.chars.unshift(DIGITS[Math.floor(Math.random() * DIGITS.length)]);
          if (stream.chars.length > stream.length) stream.chars.pop();
          stream.head++;
        }

        for (let idx = 0; idx < stream.chars.length; idx++) {
          const y = (stream.head - idx) * FONT_SIZE;
          if (y < -FONT_SIZE || y > height + FONT_SIZE) continue;
          const fade = (1 - idx / stream.length) * stream.brightness;
          ctx.fillStyle = `rgba(99,102,241,${fade.toFixed(3)})`;
          ctx.fillText(stream.chars[idx], stream.x, y);
        }

        if (stream.head * FONT_SIZE > height + stream.length * FONT_SIZE) {
          Object.assign(stream, makeStream());
        }
      }

      frame++;
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

const FEATURES = [
  {
    gradient: "from-indigo-500 to-purple-600",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Expert Predictions",
    desc: "Free and premium picks curated daily for every major game.",
  },
  {
    gradient: "from-emerald-500 to-teal-500",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: "Lapping Analysis",
    desc: "Detect repeating number patterns across consecutive draws.",
  },
  {
    gradient: "from-amber-500 to-orange-500",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
    title: "Full Draw History",
    desc: "Thousands of draws across NLA, Alpha, Rush and more.",
  },
  {
    gradient: "from-purple-500 to-pink-500",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422M12 14v7" />
      </svg>
    ),
    title: "Lotto University",
    desc: "Courses on foundations, lapping strategies and game theory.",
  },
  {
    gradient: "from-rose-500 to-red-500",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h6m-4 8a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
    title: "Community",
    desc: "Share forecasts and strategies with players nationwide.",
  },
  {
    gradient: "from-sky-500 to-blue-500",
    icon: (
      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    title: "Draw Alerts",
    desc: "Instant notifications when new predictions are published.",
  },
];


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a14] flex flex-col">

      {/* ── Digit rain background ────────────────────────────────── */}
      <DigitRain />

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0a0a14]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.jpeg" alt="Lotto Prophet" width={32} height={32} className="rounded-xl" />
            <span className="font-bold text-base bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
              Lotto Prophet
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/signin"
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/signup"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-5 pt-20 pb-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/30 dark:via-[#0a0a14] dark:to-[#0a0a14] -z-10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-indigo-400/20 to-transparent dark:from-indigo-600/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live predictions · Updated daily
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl">
          <span className="text-gray-900 dark:text-white">Play smarter.</span>
          <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Win smarter.
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-500 dark:text-gray-400 max-w-lg leading-relaxed">
          Expert picks, pattern analysis, and full draw history — built for Ghana&apos;s serious lottery players.
        </p>

        {/* CTA */}
        <div className="mt-9 flex flex-col items-center gap-2">
          <Link href="/signup"
            className="px-10 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/30 flex items-center gap-2">
            Start for free — it&apos;s instant
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Already have an account?{" "}
            <Link href="/signin" className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors">Sign in</Link>
          </p>
        </div>

      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <section className="border-y border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-5 py-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-white/5">
          {[
            { v: "10K+", l: "Active players" },
            { v: "5",    l: "Game types"    },
            { v: "Daily",l: "Expert picks"  },
            { v: "Free", l: "To join"       },
          ].map((s) => (
            <div key={s.l} className="bg-gray-50 dark:bg-[#0a0a14] px-6 py-5 text-center">
              <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{s.v}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              Everything in one place
            </h2>
            <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
              Built for serious players across Ghana&apos;s major lottery games.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title}
                className="group p-6 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-indigo-200 dark:hover:border-indigo-700/40 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 shadow-md`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1.5">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-px shadow-2xl shadow-indigo-500/30">
            <div className="relative rounded-[23px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 px-8 py-14 text-center overflow-hidden">
              {/* Inner glow */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.15)_0%,_transparent_60%)] pointer-events-none" />
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

              <p className="text-4xl mb-4">🎯</p>
              <h2 className="text-2xl sm:text-4xl font-black text-white mb-3">
                Ready to win smarter?
              </h2>
              <p className="text-indigo-100 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                Join thousands of players using data and patterns to make better picks every single day.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm bg-white text-indigo-700 hover:bg-indigo-50 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2">
                  Get started for free
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link href="/signin"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold text-sm border-2 border-white/30 text-white hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-center">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-gray-100 dark:border-white/5 py-7 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400 dark:text-gray-600">
          <div className="flex items-center gap-2">
            <Image src="/logo.jpeg" alt="" width={24} height={24} className="rounded-lg opacity-70" />
            <span>© {new Date().getFullYear()} Lotto Prophet</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/signin"  className="hover:text-indigo-500 transition-colors">Sign in</Link>
            <Link href="/signup"  className="hover:text-indigo-500 transition-colors">Sign up</Link>
            <Link href="/contact" className="hover:text-indigo-500 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
