"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PREFS_KEY = "notification_prefs";

const NOTIFICATION_SETTINGS = [
  { key: "jackpot", label: "Jackpot Events", description: "Get notified when jackpots reach record amounts", defaultOn: true, emoji: "🏆" },
  { key: "results", label: "Draw Results", description: "Receive results immediately after each draw", defaultOn: true, emoji: "✅" },
  { key: "predictions", label: "AI Predictions", description: "AI-powered number predictions and insights", defaultOn: true, emoji: "📊" },
  { key: "reminders", label: "Draw Reminders", description: "Never miss a draw with timely reminders", defaultOn: true, emoji: "⏰" },
  { key: "promo", label: "Promotions", description: "Special offers and bonus opportunities", defaultOn: false, emoji: "🎁" },
  { key: "news", label: "App News", description: "New features, updates and announcements", defaultOn: false, emoji: "📰" },
];

const DEFAULT_STATE = Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.key, s.defaultOn]));

export default function NotificationsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState(DEFAULT_STATE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/signin"); return; }
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      try { setPrefs({ ...DEFAULT_STATE, ...JSON.parse(raw) }); } catch {}
    }
  }, [router]);

  function toggle(key: string) {
    setSaved(false);
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  }

  function handleSave() {
    setSaving(true);
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }, 400);
  }

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">Manage your alert preferences</p>
        </div>

        {/* Count badge */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-sm font-medium">
            🔔 {enabledCount} of {NOTIFICATION_SETTINGS.length} alerts enabled
          </span>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardHeader>
            <CardTitle>Alert Preferences</CardTitle>
            <CardDescription>Choose which notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {NOTIFICATION_SETTINGS.map((item) => (
              <div key={item.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggle(item.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                    prefs[item.key] ? "bg-indigo-600" : "bg-muted-foreground/30"
                  }`}
                  role="switch"
                  aria-checked={prefs[item.key]}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${
                      prefs[item.key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className={`w-full h-11 font-semibold transition-colors ${
            saved
              ? "bg-green-600 hover:bg-green-600 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          {saving ? "Saving…" : saved ? "✓ Preferences Saved" : "Save Preferences"}
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Changes take effect immediately after saving.
        </p>
      </div>
    </div>
  );
}
