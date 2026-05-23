"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminDraws, deleteAdminDraw, type AdminDraw } from "@/lib/admin";

const DISPLAY_NAMES: Record<string, string> = { lucky: "Lucky Tuesday", alpha: "Alpha Lotto" };
const PAGE_SIZE = 50;

function NumberBall({ n, type }: { n: number | null; type: "N" | "M" }) {
  if (n == null) return null;
  return (
    <span className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
      type === "N"
        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    }`}>{n}</span>
  );
}

function DeleteModal({ draw, onConfirm, onCancel }: { draw: AdminDraw; onConfirm: () => void; onCancel: () => void }) {
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Draw #{draw.event_number}?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {DISPLAY_NAMES[draw.source] ?? draw.source} · {draw.date?.slice(0, 10)}<br />This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">
              Yes, delete
            </button>
            <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDrawsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [draws, setDraws] = useState<AdminDraw[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDraw | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string, src: string, off: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchAdminDraws(t, { source: src || undefined, limit: PAGE_SIZE, offset: off });
      setDraws(res.draws); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token, source, offset); }, [token, source, offset, load]);

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminDraw(token, deleteTarget.id);
      setDraws(prev => prev.filter(d => d.id !== deleteTarget.id));
      setTotal(p => p - 1);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const sources = ["", "alpha", "lucky"];

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          draw={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page header */}
      <div className="block items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex">
        <div className="mb-3 sm:mb-0">
          <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Admin</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 dark:text-white font-medium">Draws</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            All Draws {!loading && <span className="text-gray-500 dark:text-gray-400 font-normal text-base">({total.toLocaleString()})</span>}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map(s => (
            <button key={s} onClick={() => { setSource(s); setOffset(0); }}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${source === s
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
              {s === "" ? "All Sources" : (DISPLAY_NAMES[s] ?? s)}
            </button>
          ))}
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
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Event</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Source</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Numbers</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : draws.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">No draws found.</td>
              </tr>
            ) : draws.map(draw => (
              <tr key={draw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">#{draw.event_number}</span>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                    {DISPLAY_NAMES[draw.source] ?? draw.source}
                  </span>
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                  {draw.date?.slice(0, 10)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 flex-wrap">
                    {[draw.N1, draw.N2, draw.N3, draw.N4, draw.N5].map((n, i) => <NumberBall key={`n${i}`} n={n} type="N" />)}
                    {draw.M1 != null && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600 mx-0.5">|</span>
                        {[draw.M1, draw.M2, draw.M3, draw.M4, draw.M5].map((n, i) => <NumberBall key={`m${i}`} n={n} type="M" />)}
                      </>
                    )}
                  </div>
                </td>
                <td className="p-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => setDeleteTarget(draw)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete
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
