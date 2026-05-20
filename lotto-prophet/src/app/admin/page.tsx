"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type LatestDraw = {
  source: string;
  latest_event: number;
};

const DISPLAY_NAMES: Record<string, string> = {
  lucky: "Lucky Tuesday",
  alpha: "Alpha Lotto",
};

function getDisplayName(source: string): string {
  return DISPLAY_NAMES[source.toLowerCase()] ?? source;
}

export default function AdminPage() {
  const router = useRouter();

  // Auth
  const [token, setToken] = useState<string | null>(null);

  // Form state
  const [source, setSource] = useState("alpha");
  const [eventNumber, setEventNumber] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [n1, setN1] = useState("");
  const [n2, setN2] = useState("");
  const [n3, setN3] = useState("");
  const [n4, setN4] = useState("");
  const [n5, setN5] = useState("");
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [m3, setM3] = useState("");
  const [m4, setM4] = useState("");
  const [m5, setM5] = useState("");
  const [includeMachine, setIncludeMachine] = useState(true);

  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latestDraws, setLatestDraws] = useState<LatestDraw[]>([]);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) {
      router.replace("/signin");
      return;
    }
    setToken(t);
    fetchLatest(t);
  }, [router]);

  async function fetchLatest(authToken: string) {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/admin/draws/latest`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setLatestDraws(data);

      // Auto-set event number for selected source
      const match = data.find((d: LatestDraw) => d.source === source);
      if (match) {
        setEventNumber(String(match.latest_event + 1));
      }
    } catch {
      // Not critical — user can type manually
    }
  }

  // Auto-update event number when source changes
  useEffect(() => {
    const match = latestDraws.find((d) => d.source === source);
    if (match) {
      setEventNumber(String(match.latest_event + 1));
    } else {
      setEventNumber("1");
    }
  }, [source, latestDraws]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) return;

    const nNumbers = [n1, n2, n3, n4, n5].map(Number);
    const mNumbers = includeMachine ? [m1, m2, m3, m4, m5].map(Number) : undefined;

    // Basic validation
    if (nNumbers.some((n) => isNaN(n) || n < 1 || n > 90)) {
      setError("Draw numbers must be between 1 and 90");
      return;
    }
    if (mNumbers && mNumbers.some((n) => isNaN(n) || n < 1 || n > 90)) {
      setError("Machine numbers must be between 1 and 90");
      return;
    }
    if (!eventNumber || isNaN(Number(eventNumber))) {
      setError("Event number is required");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BASE_URL}/api/admin/draws`,
        {
          source,
          event_number: Number(eventNumber),
          date,
          n_numbers: nNumbers,
          m_numbers: mNumbers,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSuccess(data.message);

      // Clear number fields
      setN1(""); setN2(""); setN3(""); setN4(""); setN5("");
      setM1(""); setM2(""); setM3(""); setM4(""); setM5("");

      // Refresh latest
      fetchLatest(token);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to add draw";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground mt-1">
            Add new draw results &amp; notify all users
          </p>
        </div>

        {/* Latest draws info */}
        {latestDraws.length > 0 && (
          <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Latest Draw Numbers
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {latestDraws.map((d) => (
                <Badge key={d.source} variant="secondary" className="text-sm py-1 px-3">
                  {getDisplayName(d.source)}: #{d.latest_event}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add Draw Form */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Add New Draw</CardTitle>
            <CardDescription>
              Enter draw results. A push notification will be sent to all users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source Selection */}
              <div className="space-y-2">
                <Label>Draw Source</Label>
                <div className="flex gap-2">
                  {Object.entries(DISPLAY_NAMES).map(([key, label]) => (
                    <Button
                      key={key}
                      type="button"
                      variant={source === key ? "default" : "outline"}
                      className={
                        source === key
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : ""
                      }
                      onClick={() => setSource(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Event number + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="event_number">Event Number</Label>
                  <Input
                    id="event_number"
                    type="number"
                    value={eventNumber}
                    onChange={(e) => setEventNumber(e.target.value)}
                    placeholder="e.g. 1234"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Draw Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Draw Numbers (N) */}
              <div className="space-y-2">
                <Label>Draw Numbers</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { val: n1, set: setN1 },
                    { val: n2, set: setN2 },
                    { val: n3, set: setN3 },
                    { val: n4, set: setN4 },
                    { val: n5, set: setN5 },
                  ].map((field, i) => (
                    <Input
                      key={`n${i}`}
                      type="number"
                      min={1}
                      max={90}
                      value={field.val}
                      onChange={(e) => field.set(e.target.value)}
                      placeholder={`N${i + 1}`}
                      className="text-center font-mono text-lg"
                      required
                    />
                  ))}
                </div>
              </div>

              {/* Machine Numbers toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="includeMachine"
                  checked={includeMachine}
                  onChange={(e) => setIncludeMachine(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="includeMachine" className="cursor-pointer">
                  Include Machine Numbers
                </Label>
              </div>

              {/* Machine Numbers (M) */}
              {includeMachine && (
                <div className="space-y-2">
                  <Label>Machine Numbers</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { val: m1, set: setM1 },
                      { val: m2, set: setM2 },
                      { val: m3, set: setM3 },
                      { val: m4, set: setM4 },
                      { val: m5, set: setM5 },
                    ].map((field, i) => (
                      <Input
                        key={`m${i}`}
                        type="number"
                        min={1}
                        max={90}
                        value={field.val}
                        onChange={(e) => field.set(e.target.value)}
                        placeholder={`M${i + 1}`}
                        className="text-center font-mono text-lg"
                        required={includeMachine}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Status messages */}
              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {success}
                  </p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white h-12 font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
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
                    Adding Draw...
                  </span>
                ) : (
                  "Add Draw & Notify Users"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
