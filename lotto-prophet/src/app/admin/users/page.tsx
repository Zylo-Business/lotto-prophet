"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminUsers, deleteAdminUser, updateUserSubscription, type AdminUser } from "@/lib/admin";

const PLANS = ["free", "basic", "pro", "premium"] as const;
const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  premium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const PAGE_SIZE = 50;

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0] ?? "").join("").slice(0, 2).toUpperCase();
  const colors = ["bg-indigo-600", "bg-emerald-600", "bg-purple-600", "bg-rose-600", "bg-amber-600", "bg-cyan-600"];
  const color = colors[(name.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function DeleteModal({ user, onConfirm, onCancel }: { user: AdminUser; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete {user.firstname} {user.surname}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}<br />This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Yes, delete</button>
            <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionModal({ user, onSave, onCancel, saving }: {
  user: AdminUser; onSave: (plan: string, expires: string) => void; onCancel: () => void; saving: boolean;
}) {
  const [plan, setPlan] = useState(user.subscription_plan || "free");
  const [expires, setExpires] = useState(user.subscription_expires_at?.slice(0, 10) ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Update Subscription</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{user.firstname} {user.surname}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Plan</label>
            <select className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={plan} onChange={e => setPlan(e.target.value)}>
              {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Expires (leave blank for no expiry)</label>
            <input type="date" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={expires} onChange={e => setExpires(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={() => onSave(plan, expires)} disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [subTarget, setSubTarget] = useState<AdminUser | null>(null);
  const [savingSub, setSavingSub] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(search); setOffset(0); }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const load = useCallback(async (t: string, s: string, off: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchAdminUsers(t, { search: s || undefined, limit: PAGE_SIZE, offset: off });
      setUsers(res.users); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token, debouncedSearch, offset); }, [token, debouncedSearch, offset, load]);

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(token, deleteTarget.id);
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setTotal(p => p - 1);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  async function handleSaveSub(plan: string, expires: string) {
    if (!token || !subTarget) return;
    setSavingSub(true);
    try {
      const updated = await updateUserSubscription(token, subTarget.id, plan, expires || undefined);
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, subscription_plan: updated.subscription_plan, subscription_expires_at: updated.subscription_expires_at } : u));
      setSubTarget(null);
    } catch (e: any) { setError(e.message); }
    finally { setSavingSub(false); }
  }

  return (
    <>
      {deleteTarget && <DeleteModal user={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
      {subTarget && <SubscriptionModal user={subTarget} onSave={handleSaveSub} onCancel={() => setSubTarget(null)} saving={savingSub} />}

      {/* Page header */}
      <div className="block items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex">
        <div className="mb-3 sm:mb-0">
          <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Admin</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 dark:text-white font-medium">Users</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            All Users {!loading && <span className="text-gray-500 dark:text-gray-400 font-normal text-base">({total.toLocaleString()})</span>}
          </h1>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="search"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 w-64"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Phone</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Joined</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">Subscription</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${user.firstname} ${user.surname}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.firstname} {user.surname}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                  {user.country_code} {user.mobile_number}
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums hidden md:table-cell">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 whitespace-nowrap hidden lg:table-cell">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[user.subscription_plan || "free"] ?? PLAN_COLORS.free}`}>
                    {user.subscription_plan || "free"}
                  </span>
                  {user.subscription_expires_at && (
                    <p className="text-xs text-gray-400 mt-0.5">Until {new Date(user.subscription_expires_at).toLocaleDateString()}</p>
                  )}
                </td>
                <td className="p-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setSubTarget(user)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                      Subscription
                    </button>
                    <button onClick={() => setDeleteTarget(user)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sticky pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 right-0 w-full items-center border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex sm:justify-between">
          <div className="mb-3 flex items-center sm:mb-0">
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <svg className="mr-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} / {totalPages}</span>
            <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Next
              <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
