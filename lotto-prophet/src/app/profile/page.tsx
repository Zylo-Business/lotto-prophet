"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentUser, updateProfile, changePassword, type User } from "@/lib/auth";

type Tab = "information" | "password";

function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!t || !raw) { router.replace("/signin"); return; }
    setToken(t);
    try { setUser(JSON.parse(raw)); } catch { router.replace("/signin"); }
  }, [router]);

  return { user, token, setUser };
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>("information");
  const { user, token, setUser } = useAuth();

  if (!user || !token) return <LoadingSpinner />;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account details</p>
        </div>

        {/* Avatar card */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center shrink-0">
              <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {user.firstname[0]?.toUpperCase()}{user.surname[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{user.firstname} {user.surname}</p>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 capitalize">
                {user.role}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-card rounded-xl p-1.5 shadow-sm">
          {(["information", "password"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? "bg-indigo-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "information" ? "Personal Info" : "Change Password"}
            </button>
          ))}
        </div>

        {tab === "information" ? (
          <InfoTab user={user} token={token} onUpdated={setUser} />
        ) : (
          <PasswordTab token={token} />
        )}
      </div>
    </div>
  );
}

function InfoTab({ user, token, onUpdated }: { user: User; token: string; onUpdated: (u: User) => void }) {
  const [form, setForm] = useState({
    firstname: user.firstname,
    surname: user.surname,
    country_code: user.country_code,
    mobile_number: user.mobile_number,
    date_of_birth: user.date_of_birth ? user.date_of_birth.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    if (!form.firstname || !form.surname || !form.country_code || !form.mobile_number || !form.date_of_birth) {
      setMsg({ type: "error", text: "Please fill in all fields." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await updateProfile(token, form);
      localStorage.setItem("user", JSON.stringify(res.user));
      onUpdated(res.user);
      setMsg({ type: "success", text: "Profile updated successfully." });
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Your email address cannot be changed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 text-sm text-muted-foreground">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
          </svg>
          {user.email}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" value={form.firstname} onChange={(v) => set("firstname", v)} />
          <Field label="Last Name" value={form.surname} onChange={(v) => set("surname", v)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Country Code" value={form.country_code} onChange={(v) => set("country_code", v)} placeholder="+233" />
          <Field label="Mobile Number" value={form.mobile_number} onChange={(v) => set("mobile_number", v)} placeholder="0201234567" type="tel" />
        </div>
        <Field label="Date of Birth" value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} placeholder="YYYY-MM-DD" />

        {msg && (
          <p className={`text-sm font-medium ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-11">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PasswordTab({ token }: { token: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleChange() {
    if (!current || !next || !confirm) { setMsg({ type: "error", text: "Please fill in all fields." }); return; }
    if (next.length < 8) { setMsg({ type: "error", text: "New password must be at least 8 characters." }); return; }
    if (next !== confirm) { setMsg({ type: "error", text: "New passwords do not match." }); return; }
    setSaving(true);
    setMsg(null);
    try {
      await changePassword(token, current, next);
      setMsg({ type: "success", text: "Password changed successfully." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e: any) {
      setMsg({ type: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <CardTitle className="text-center">Change Password</CardTitle>
        <CardDescription className="text-center">Enter your current password to set a new one</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Current Password" value={current} onChange={setCurrent} type="password" />
        <Field label="New Password" value={next} onChange={setNext} type="password" placeholder="Min. 8 characters" />
        <Field label="Confirm New Password" value={confirm} onChange={setConfirm} type="password" placeholder="Repeat new password" />

        {msg && (
          <p className={`text-sm font-medium ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {msg.text}
          </p>
        )}

        <Button onClick={handleChange} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white h-11">
          {saving ? "Updating…" : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-11" />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}
