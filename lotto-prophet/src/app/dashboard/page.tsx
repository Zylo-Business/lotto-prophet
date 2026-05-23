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

type User = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sources, setSources] = useState<DrawSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const stored = localStorage.getItem("user");

    if (!token || !stored) {
      router.replace("/signin");
      return;
    }

    try {
      setUser(JSON.parse(stored));
    } catch {
      router.replace("/signin");
      return;
    }

    fetchDrawSources()
      .then((data) => setSources(data))
      .catch(() => {})
      .finally(() => setSourcesLoading(false));
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back{user?.firstname ? `, ${user.firstname}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a draw to view results
          </p>
        </div>

        {/* Draw Sources */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4">Draws</h2>
          {sourcesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-4xl mb-3">🎲</span>
                <p className="text-muted-foreground font-medium">No draws available yet</p>
                <p className="text-sm text-muted-foreground mt-1">Draws will appear here once data is synced</p>
              </CardContent>
            </Card>
          ) : (
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
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {source.draw_count.toLocaleString()} draws
                          </p>
                        </div>
                        <svg
                          className="w-5 h-5 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tools Section */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Analysis Tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/tools/lapping-2">
              <Card className="border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-indigo-500/30 group">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Lapping 2</CardTitle>
                    <p className="text-xs text-muted-foreground">2-row pattern analysis</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Detect patterns across 2 consecutive draws
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tools/lapping-3">
              <Card className="border-0 shadow-sm cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-amber-500/30 group">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                  </div>
                  <div>
                    <CardTitle className="text-base group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Lapping 3</CardTitle>
                    <p className="text-xs text-muted-foreground">3-row pattern analysis</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Scan 3-row patterns across consecutive draws
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
