"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { type User } from "@/lib/auth";

const SETTINGS_KEY = "app_settings";

type SettingsSaved = { analytics: boolean };

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-indigo-600" : "bg-muted-foreground/30"
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, right, danger = false }: {
  icon: React.ReactNode; label: string; description?: string;
  right: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${danger ? "text-red-600 dark:text-red-400" : ""}`}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {right}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [analytics, setAnalytics] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) { router.replace("/signin"); return; }
    try {
      setUser(JSON.parse(raw));
      const settingsRaw = localStorage.getItem(SETTINGS_KEY);
      if (settingsRaw) {
        const s: SettingsSaved = JSON.parse(settingsRaw);
        if (s.analytics !== undefined) setAnalytics(s.analytics);
      }
    } catch { router.replace("/signin"); }
  }, [router]);

  function persistAnalytics(val: boolean) {
    setAnalytics(val);
    const existing = localStorage.getItem(SETTINGS_KEY);
    const current = existing ? JSON.parse(existing) : {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, analytics: val }));
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.replace("/signin");
  }

  if (!user) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Customize your experience</p>
        </div>

        {/* Account Card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {user.firstname[0]?.toUpperCase()}{user.surname[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{user.firstname} {user.surname}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
            </div>
            <Link href="/profile">
              <Button variant="outline" size="sm">Edit Profile</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Section title="Appearance">
          <SettingRow
            icon={<MoonIcon />}
            label="Theme"
            description="Switch between light and dark mode"
            right={<ThemeToggle />}
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <SettingRow
            icon={<ChartIcon />}
            label="Analytics"
            description="Help us improve with anonymous usage data"
            right={<Toggle checked={analytics} onChange={() => persistAnalytics(!analytics)} />}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <SettingRow
            icon={<BellIcon />}
            label="Alert Preferences"
            description="Choose which notifications you receive"
            right={
              <Link href="/notifications">
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            }
          />
        </Section>

        {/* Subscription */}
        <Section title="Subscription">
          <SettingRow
            icon={<DiamondIcon />}
            label="Current Plan"
            description="Upgrade to unlock AI predictions and more"
            right={
              <Link href="/subscription">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Upgrade</Button>
              </Link>
            }
          />
        </Section>

        {/* About */}
        <Section title="About">
          <SettingRow
            icon={<InfoIcon />}
            label="App Version"
            right={<span className="text-sm text-muted-foreground">1.0.0</span>}
          />
        </Section>

        {/* Account Actions */}
        <Section title="Account">
          <SettingRow
            icon={<LogoutIcon />}
            label="Sign Out"
            right={
              showConfirm ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleLogout}>Sign Out</Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setShowConfirm(true)}>
                  Sign Out
                </Button>
              )
            }
            danger
          />
          <div className="border-t border-border" />
          <SettingRow
            icon={<TrashIcon />}
            label="Delete Account"
            description="Contact support@lottoprophet.com to request account deletion"
            right={
              <span className="text-xs text-muted-foreground italic">via support</span>
            }
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 ml-1">{title}</p>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4 divide-y divide-border/60">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function MoonIcon() {
  return <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;
}
function ChartIcon() {
  return <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function BellIcon() {
  return <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
}
function DiamondIcon() {
  return <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
}
function InfoIcon() {
  return <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function LogoutIcon() {
  return <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
}
function TrashIcon() {
  return <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
}
