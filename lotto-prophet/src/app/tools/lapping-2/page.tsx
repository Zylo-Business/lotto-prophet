"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchDrawSources,
  getDrawDisplayName,
  type DrawSource,
} from "@/lib/draws";
import { fetchLapping2, type Lapping2Response } from "@/lib/tools";

type ColumnsMode = "main" | "machine" | "all";
const NUM_ROWS = 2;

function getDefaultPattern(mode: ColumnsMode): string[][] {
  const numCols = mode === "all" ? 10 : 5;
  return Array.from({ length: NUM_ROWS }, () => new Array(numCols).fill(""));
}

function getColumnLabels(mode: ColumnsMode): string[] {
  if (mode === "machine") return ["M1", "M2", "M3", "M4", "M5"];
  if (mode === "all")
    return ["N1", "N2", "N3", "N4", "N5", "M1", "M2", "M3", "M4", "M5"];
  return ["N1", "N2", "N3", "N4", "N5"];
}

export default function Lapping2Page() {
  const router = useRouter();

  const [sources, setSources] = useState<DrawSource[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [columnsMode, setColumnsMode] = useState<ColumnsMode>("main");
  const [limit, setLimit] = useState(200);

  const [patternRows, setPatternRows] = useState<string[][]>(
    getDefaultPattern("main"),
  );
  const patternRef = useRef(patternRows);
  patternRef.current = patternRows;

  const columnLabels = getColumnLabels(columnsMode);

  const [result, setResult] = useState<Lapping2Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cross-game search
  const [crossSources, setCrossSources] = useState<string[]>([]);
  const [crossResults, setCrossResults] = useState<Record<string, Lapping2Response>>({});
  const crossRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const hasPattern = patternRows.some((row) =>
    row.some((v) => v.trim() !== "" && parseInt(v) > 0),
  );

  // Load sources
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    (async () => {
      try {
        const data = await fetchDrawSources();
        setSources(data);
        if (data.length > 0) setSelectedSource(data[0].source);
      } catch (err: any) {
        setError(err.message || "Failed to load sources");
      } finally {
        setSourcesLoading(false);
      }
    })();
  }, [router]);

  const changeColumnsMode = useCallback((mode: ColumnsMode) => {
    setColumnsMode(mode);
    setPatternRows(getDefaultPattern(mode));
  }, []);

  const updateCell = useCallback(
    (rowIdx: number, colIdx: number, text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "");
      setPatternRows((prev) => {
        const next = prev.map((r) => [...r]);
        next[rowIdx][colIdx] = cleaned;
        return next;
      });
    },
    [],
  );

  const clearPattern = useCallback(() => {
    setPatternRows(getDefaultPattern(columnsMode));
  }, [columnsMode]);

  const toggleCrossSource = useCallback((src: string) => {
    setCrossSources((prev) =>
      prev.includes(src) ? prev.filter((s) => s !== src) : [...prev, src],
    );
  }, []);

  const scrollToSource = useCallback(
    (src: string) => {
      if (src === selectedSource) {
        document
          .getElementById("main-results")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        crossRefs.current[src]?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [selectedSource],
  );

  const fillFromDraw = useCallback(
    (drawIndex: number) => {
      if (!result) return;
      const newRows = Array.from({ length: NUM_ROWS }, (_, ri) => {
        const gridRow = result.grid[drawIndex + ri];
        if (!gridRow) return new Array(getColumnLabels(columnsMode).length).fill("");
        return gridRow.map((v) => (v > 0 ? String(v) : ""));
      });
      setPatternRows(newRows);
    },
    [result, columnsMode],
  );

  const runAnalysis = useCallback(async () => {
    if (!selectedSource) return;
    try {
      setLoading(true);
      setError(null);
      const rows = patternRef.current.map((row) =>
        row.map((v) => {
          const n = parseInt(v, 10);
          return !isNaN(n) && n >= 1 && n <= 90 ? n : 0;
        }),
      );
      const anyPattern = rows.some((row) => row.some((v) => v !== 0));
      const patternArg = anyPattern ? rows : undefined;

      // Fetch primary + cross sources in parallel
      const allSources = [
        selectedSource,
        ...crossSources.filter((s) => s !== selectedSource),
      ];
      const results = await Promise.all(
        allSources.map((src) =>
          fetchLapping2(src, columnsMode, limit, patternArg),
        ),
      );

      setResult(results[0]);
      const newCross: Record<string, Lapping2Response> = {};
      allSources.forEach((src, i) => {
        newCross[src] = results[i];
      });
      setCrossResults(newCross);
    } catch (err: any) {
      setError(err.message || "Failed to run analysis");
    } finally {
      setLoading(false);
    }
  }, [selectedSource, columnsMode, limit, crossSources]);

  // Auto-run
  useEffect(() => {
    if (selectedSource) runAnalysis();
  }, [runAnalysis]);

  // Stats
  const lappingCount = result?.lappingRows.length ?? 0;
  const lappingPct =
    result && result.total > 0
      ? ((lappingCount / result.total) * 100).toFixed(1)
      : "0";

  if (sourcesLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <svg
          className="h-12 w-12 animate-spin text-indigo-500"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-muted-foreground font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:text-foreground transition-colors"
        >
          Dashboard
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">Lapping 2</span>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Lapping 2 Analysis
        </h1>
        <p className="text-muted-foreground">
          Scans 2 consecutive rows per column — if bottom matches row 1 and top
          matches row 2, the entire column is highlighted.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-4 mb-6 rounded-xl border border-border bg-card p-4 shadow-sm">
        {/* Source */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Source
          </label>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            {sources.map((s) => (
              <option key={s.source} value={s.source}>
                {getDrawDisplayName(s.source)} ({s.draw_count} draws)
              </option>
            ))}
          </select>
        </div>

        {/* Columns */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Columns
          </label>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={columnsMode}
            onChange={(e) => changeColumnsMode(e.target.value as ColumnsMode)}
          >
            <option value="main">Main (N1–N5)</option>
            <option value="machine">Machine (M1–M5)</option>
            <option value="all">All (N1–N5 + M1–M5)</option>
          </select>
        </div>

        {/* Limit */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Last N draws
          </label>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[50, 100, 200, 500, 1000].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Cross-Game Search */}
        {sources.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Also search in
            </label>
            <div className="flex flex-wrap gap-3">
              {sources
                .filter((s) => s.source !== selectedSource)
                .map((s) => {
                  const checked = crossSources.includes(s.source);
                  return (
                    <label
                      key={s.source}
                      className="flex items-center gap-1.5 text-sm cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCrossSource(s.source)}
                        className="accent-indigo-500 w-4 h-4"
                      />
                      <span
                        className={
                          checked
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {getDrawDisplayName(s.source)}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>
        )}

        <Button
          onClick={runAnalysis}
          disabled={loading}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          {loading ? "Analysing…" : "Run Analysis"}
        </Button>
      </div>

      {/* Pattern Grid */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Pattern Grid (2 Rows)
          </h3>
          <div className="flex gap-2">
            {hasPattern && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearPattern}
                className="text-xs"
              >
                Clear
              </Button>
            )}
            <Button
              size="sm"
              onClick={runAnalysis}
              disabled={loading || !hasPattern}
              className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {loading ? "Searching…" : "Search Pattern"}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Enter numbers (1–90) per column. Leave blank to skip. Press{" "}
          <strong>Search Pattern</strong> to find matching consecutive rows.
        </p>

        {result && result.grid.length >= NUM_ROWS && (
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
              Fill from draw
            </label>
            <select
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs"
              value=""
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (!isNaN(idx)) fillFromDraw(idx);
              }}
            >
              <option value="">Select a draw…</option>
              {result.draws.map((draw, i) =>
                i + NUM_ROWS <= result.draws.length ? (
                  <option key={i} value={i}>
                    #{draw.event_number} — {new Date(draw.date).toLocaleDateString()}
                  </option>
                ) : null,
              )}
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground w-16">
                  Row
                </th>
                {columnLabels.map((col) => (
                  <th
                    key={col}
                    className="px-1 py-1.5 text-center text-xs font-medium text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patternRows.map((row, ri) => (
                <tr key={ri}>
                  <td className="px-2 py-1 text-xs text-muted-foreground font-medium">
                    Row {ri + 1}
                  </td>
                  {row.map((val, ci) => (
                    <td key={ci} className="px-1 py-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={val}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        className="w-14 h-9 text-center text-sm tabular-nums focus:ring-indigo-500"
                        placeholder="–"
                        maxLength={2}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cross-Game Summary */}
      {Object.keys(crossResults).length > 1 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-indigo-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
              />
            </svg>
            Cross-Game Results
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(crossResults).map(([src, res]) => {
              const hits = res.lappingRows.length;
              const rate =
                res.total > 0
                  ? ((hits / res.total) * 100).toFixed(1)
                  : "0";
              const isPrimary = src === selectedSource;
              return (
                <button
                  key={src}
                  onClick={() => scrollToSource(src)}
                  className={`text-left rounded-lg border p-3 transition-all hover:shadow-md ${
                    isPrimary
                      ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800"
                      : "border-border bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {getDrawDisplayName(src)}
                    </span>
                    {isPrimary && (
                      <span className="text-[10px] uppercase tracking-wide font-bold text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Draws:{" "}
                      <strong className="text-foreground">{res.total}</strong>
                    </span>
                    <span>
                      Hits:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {hits}
                      </strong>
                    </span>
                    <span>
                      Rate:{" "}
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {rate}%
                      </strong>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 mb-6 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      {result && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm">
            <span className="text-muted-foreground">Draws analysed:</span>{" "}
            <span className="font-semibold text-foreground">{result.total}</span>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm">
            <span className="text-muted-foreground">Columns:</span>{" "}
            <span className="font-semibold text-foreground">
              {result.columnNames.length}
            </span>
          </div>
          <div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-4 py-2 text-sm shadow-sm">
            <span className="text-indigo-700 dark:text-indigo-300">
              Lapping rows:
            </span>{" "}
            <span className="font-semibold text-indigo-800 dark:text-indigo-200">
              {lappingCount}
            </span>
          </div>
          <div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-4 py-2 text-sm shadow-sm">
            <span className="text-indigo-700 dark:text-indigo-300">
              Hit rate:
            </span>{" "}
            <span className="font-semibold text-indigo-800 dark:text-indigo-200">
              {lappingPct}%
            </span>
          </div>
          {hasPattern && (
            <div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 px-4 py-2 text-sm shadow-sm">
              <span className="text-indigo-700 dark:text-indigo-300">
                Mode:
              </span>{" "}
              <span className="font-semibold text-indigo-800 dark:text-indigo-200">
                Pattern
              </span>
            </div>
          )}
        </div>
      )}

      {/* Results Table */}
      {result && result.grid.length > 0 && (
        <div
          id="main-results"
          className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/50 z-10">
                    #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Event
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Date
                  </th>
                  {result.columnNames.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.draws.map((draw, ri) => {
                  const isLapping = result.lappingRows.includes(ri);
                  return (
                    <tr
                      key={draw.event_number}
                      className={`border-b border-border/50 transition-colors ${
                        isLapping
                          ? "bg-indigo-50 dark:bg-indigo-950/30"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className={`px-3 py-2 tabular-nums sticky left-0 z-10 ${isLapping ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold" : "bg-card text-muted-foreground"}`}>
                        {ri + 1}
                      </td>
                      <td className={`px-3 py-2 font-medium tabular-nums ${isLapping ? "text-indigo-700 dark:text-indigo-300" : "text-foreground"}`}>
                        {draw.event_number}
                      </td>
                      <td className={`px-3 py-2 whitespace-nowrap ${isLapping ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`}>
                        {new Date(draw.date).toLocaleDateString()}
                      </td>
                      {result.grid[ri].map((val, ci) => (
                        <td
                          key={ci}
                          className={`px-3 py-2 text-center tabular-nums font-medium ${
                            result.highlights[ri]?.[ci]
                              ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                              : "text-foreground"
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cross-Game Detail Tables */}
      {crossSources
        .filter((s) => s !== selectedSource)
        .map((src) => {
          const res = crossResults[src];
          if (!res || res.grid.length === 0) return null;
          return (
            <div
              key={src}
              ref={(el) => {
                crossRefs.current[src] = el;
              }}
              className="rounded-xl border border-border bg-card shadow-sm overflow-hidden mt-6"
            >
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {getDrawDisplayName(src)}
                </h3>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>
                    Draws: <strong>{res.total}</strong>
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    Hits: <strong>{res.lappingRows.length}</strong>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide sticky left-0 bg-muted/50 z-10">
                        #
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Event
                      </th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Date
                      </th>
                      {res.columnNames.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {res.draws.map((draw, ri) => {
                      const isLapping = res.lappingRows.includes(ri);
                      return (
                        <tr
                          key={draw.event_number}
                          className={`border-b border-border/50 transition-colors ${
                            isLapping
                              ? "bg-indigo-50 dark:bg-indigo-950/30"
                              : "hover:bg-muted/30"
                          }`}
                        >
                          <td
                            className={`px-3 py-2 tabular-nums sticky left-0 z-10 ${
                              isLapping
                                ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold"
                                : "bg-card text-muted-foreground"
                            }`}
                          >
                            {ri + 1}
                          </td>
                          <td
                            className={`px-3 py-2 font-medium tabular-nums ${
                              isLapping
                                ? "text-indigo-700 dark:text-indigo-300"
                                : "text-foreground"
                            }`}
                          >
                            {draw.event_number}
                          </td>
                          <td
                            className={`px-3 py-2 whitespace-nowrap ${
                              isLapping
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(draw.date).toLocaleDateString()}
                          </td>
                          {res.grid[ri].map((val, ci) => (
                            <td
                              key={ci}
                              className={`px-3 py-2 text-center tabular-nums font-medium ${
                                res.highlights[ri]?.[ci]
                                  ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200"
                                  : "text-foreground"
                              }`}
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

      {/* No results */}
      {result && result.grid.length === 0 && !loading && (
        <div className="rounded-xl border border-border bg-card p-10 text-center shadow-sm">
          <p className="text-muted-foreground text-lg">
            Not enough draws to perform lapping-2 analysis (minimum 2 required).
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {loading && result && (
        <div className="flex items-center justify-center gap-3 py-8">
          <svg
            className="h-6 w-6 animate-spin text-indigo-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-muted-foreground">Re-analysing…</p>
        </div>
      )}
    </div>
  );
}
