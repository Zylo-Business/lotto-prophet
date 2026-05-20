"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  fetchDrawSources,
  getDrawDisplayName,
  getDrawIcon,
  getDrawColor,
  type DrawSource,
} from "@/lib/draws";
import { Button } from "@/components/ui/button";

export default function DrawsPage() {
  const router = useRouter();
  const [sources, setSources] = useState<DrawSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadSources();
  }, [router]);

  async function loadSources() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDrawSources();
      setSources(data);
    } catch (err: any) {
      setError(err.message || "Failed to load draws");
    } finally {
      setLoading(false);
    }
  }

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
        <p className="text-muted-foreground font-medium">Loading draws...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={loadSources}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Draws</h1>
          <p className="text-muted-foreground mt-1">
            Select a draw to view results
          </p>
        </div>

        {/* Draw Sources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => {
            const displayName = getDrawDisplayName(source.source);
            const icon = getDrawIcon(source.source);
            const color = getDrawColor(source.source);

            return (
              <Link
                key={source.source}
                href={`/draws/${encodeURIComponent(source.source)}`}
              >
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {displayName}
                      </CardTitle>
                    </div>
                    <svg
                      className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.25 4.5l7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {source.draw_count.toLocaleString()} draws available
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {sources.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-4">🎲</span>
              <p className="text-muted-foreground font-medium">
                No draws found in the database
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Draws will appear here once data is seeded
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
