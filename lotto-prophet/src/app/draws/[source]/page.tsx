"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchDrawsBySource,
  getDrawDisplayName,
  getDrawColor,
  type DrawFlat,
} from "@/lib/draws";

const PAGE_SIZE = 30;

export default function DrawDetailPage() {
  const router = useRouter();
  const params = useParams();
  const source = params.source as string;

  const [draws, setDraws] = useState<DrawFlat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const displayName = getDrawDisplayName(source || "");
  const accentColor = getDrawColor(source || "");

  const loadDraws = useCallback(
    async (offset = 0) => {
      if (!source) return;
      try {
        if (offset === 0) {
          setLoading(true);
          setError(null);
        } else {
          setLoadingMore(true);
        }
        const data = await fetchDrawsBySource(source, PAGE_SIZE, offset);
        setTotal(data.total);
        if (offset === 0) {
          setDraws(data.draws);
        } else {
          setDraws((prev) => [...prev, ...data.draws]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load draw data");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [source],
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadDraws(0);
  }, [router, loadDraws]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <svg
          className="h-12 w-12 animate-spin text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-muted-foreground font-medium">
          Loading {displayName} draws...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => loadDraws(0)}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/draws"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Draws
            </Link>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium">{displayName}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{displayName}</h1>
              <p className="text-muted-foreground mt-1">
                {total.toLocaleString()} draws available &middot; Showing{" "}
                {draws.length.toLocaleString()}
              </p>
            </div>
            {draws.length > 0 && (
              <Button
                variant={copied ? "default" : "outline"}
                size="sm"
                className={`gap-2 shrink-0 transition-colors ${
                  copied
                    ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                    : ""
                }`}
                onClick={async () => {
                  const first50 = draws.slice(0, 50);
                  const lines = first50.map((d) => {
                    const main = [d.N1, d.N2, d.N3, d.N4, d.N5].join(", ");
                    const machine = [d.M1, d.M2, d.M3, d.M4, d.M5].filter(
                      (n) => n !== null && n !== undefined
                    );
                    const machineStr =
                      machine.length > 0
                        ? ` | Machine: ${machine.join(", ")}`
                        : "";
                    return `#${d.event_number} (${d.date}) Draw: ${main}${machineStr}`;
                  });
                  const text = `${displayName} \u2014 First ${first50.length} Draws\n${"\u2014".repeat(30)}\n${lines.join("\n")}`;
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
                {copied ? "Copied!" : "Copy First 50"}
              </Button>
            )}
          </div>
        </div>

        {/* Draws Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    #
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                    Date
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    Draw
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    Sum
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    Machine
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    M Sum
                  </th>
                </tr>
              </thead>
              <tbody>
                {draws.map((draw) => {
                  const mainNumbers = [
                    draw.N1,
                    draw.N2,
                    draw.N3,
                    draw.N4,
                    draw.N5,
                  ];
                  const megaNumbers = [
                    draw.M1,
                    draw.M2,
                    draw.M3,
                    draw.M4,
                    draw.M5,
                  ];
                  const hasMega = megaNumbers.some(
                    (n) => n !== null && n !== undefined,
                  );

                  return (
                    <tr
                      key={`${draw.source}-${draw.event_number}`}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">
                        {draw.event_number}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {draw.date}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {mainNumbers.map((n, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold"
                              style={{
                                backgroundColor: `${accentColor}20`,
                                color: accentColor,
                              }}
                            >
                              {n}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="secondary" className="font-mono">
                          {draw.n_sum}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {hasMega ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {megaNumbers.map((n, i) =>
                              n !== null && n !== undefined ? (
                                <span
                                  key={i}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
                                >
                                  {n}
                                </span>
                              ) : null,
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {hasMega ? (
                          <Badge variant="outline" className="font-mono">
                            {draw.m_sum}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Load More */}
        {draws.length < total && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => loadDraws(draws.length)}
              disabled={loadingMore}
              className="min-w-[160px]"
            >
              {loadingMore ? (
                <svg
                  className="h-4 w-4 animate-spin mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : null}
              {loadingMore ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
