"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminPushTokens, deleteAdminPushToken, broadcastNotification, type AdminPushToken } from "@/lib/admin";

const PAGE_SIZE = 50;

function DeleteModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revoke Push Token?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This device will no longer receive notifications.<br />This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Yes, revoke</button>
            <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState<AdminPushToken[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPushToken | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [bTitle, setBTitle] = useState("");
  const [bBody, setBBody] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; failed: number } | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string, off: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchAdminPushTokens(t, { limit: PAGE_SIZE, offset: off });
      setTokens(res.tokens); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token, offset); }, [token, offset, load]);

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminPushToken(token, deleteTarget.id);
      setTokens(prev => prev.filter(t => t.id !== deleteTarget.id));
      setTotal(p => p - 1);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !bTitle.trim() || !bBody.trim()) return;
    setBroadcasting(true); setBroadcastResult(null); setBroadcastError(null);
    try {
      const res = await broadcastNotification(token, bTitle.trim(), bBody.trim());
      setBroadcastResult({ sent: res.sent, failed: res.failed });
      setBTitle(""); setBBody("");
    } catch (e: any) { setBroadcastError(e.message); }
    finally { setBroadcasting(false); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      {deleteTarget && <DeleteModal onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}

      {/* Page header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4">
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Admin</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-900 dark:text-white font-medium">Notifications</span>
        </nav>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Push Notifications</h1>
      </div>

      {/* Broadcast card */}
      <div className="m-4">
        <div className="rounded-lg bg-white dark:bg-gray-800 shadow p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Broadcast Notification</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Send a push notification to all {total.toLocaleString()} registered devices.</p>
          <form onSubmit={handleBroadcast} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="btitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                id="btitle"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={bTitle}
                onChange={e => setBTitle(e.target.value)}
                placeholder="Notification title"
                required
              />
            </div>
            <div>
              <label htmlFor="bbody" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
              <input
                id="bbody"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={bBody}
                onChange={e => setBBody(e.target.value)}
                placeholder="Notification body"
                required
              />
            </div>
            {broadcastError && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400">{broadcastError}</p>
              </div>
            )}
            {broadcastResult && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  Sent — {broadcastResult.sent} delivered, {broadcastResult.failed} failed.
                </p>
              </div>
            )}
            <button type="submit" disabled={broadcasting || !bTitle.trim() || !bBody.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {broadcasting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  Send to All Devices
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Tokens section header */}
      <div className="block items-center justify-between border-b border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3 sm:flex">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Device Push Tokens {!loading && <span className="text-gray-500 dark:text-gray-400 font-normal">({total.toLocaleString()})</span>}
        </h2>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Tokens table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Token</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Platform</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">User</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Registered</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                ))}</tr>
              ))
            ) : tokens.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">No push tokens registered.</td></tr>
            ) : tokens.map(t => (
              <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{t.token.slice(0, 20)}…</span>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 capitalize">
                    {t.platform}
                  </span>
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                  {t.firstname ? `${t.firstname} ${t.surname}` : <span className="text-xs italic text-gray-400">anonymous</span>}
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums hidden md:table-cell">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 whitespace-nowrap text-right">
                  <button onClick={() => setDeleteTarget(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Revoke
                  </button>
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
