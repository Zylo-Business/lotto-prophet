"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAdminDraws, deleteAdminDraw, addAdminDraw,
  type AdminDraw, type AdminDrawCreate,
} from "@/lib/admin";

type SourceGroup = { label: string; sources: string[]; addSource: string };

const SOURCE_GROUPS: SourceGroup[] = [
  {
    label: "NLA",
    sources: ["aseda", "bonanza", "fortune", "lucky", "midwk", "msp", "national"],
    addSource: "national",
  },
  {
    label: "NLA Rush",
    sources: ["FRI_RUSH", "MON_RUSH", "SAT_RUSH", "THURS_RUSH", "TUE_RUSH", "WED_RUSH"],
    addSource: "MON_RUSH",
  },
  {
    label: "Alpha Lotto",
    sources: ["alpha m", "delta", "excel", "kenstar", "omega", "precise", "prime"],
    addSource: "alpha m",
  },
  {
    label: "Alpha One",
    sources: ["one excel", "one friday", "one monday", "one saturday", "one sunday", "one tuesday", "one wednesday"],
    addSource: "one monday",
  },
  {
    label: "Alpha Express",
    sources: ["express excel", "express friday", "express monday", "express saturday", "express sunday", "express tuesday", "express wednesday"],
    addSource: "express monday",
  },
];
const PAGE_SIZE = 50;

type NumRow = [string, string, string, string, string];

function emptyRow(): NumRow { return ["", "", "", "", ""]; }

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
              {draw.source} · {draw.date?.slice(0, 10)}<br />This cannot be undone.
            </p>
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

const numInput = "w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 py-1.5 text-sm text-center text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums";
const selectInput = "rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export default function AdminDrawsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [groupIdx, setGroupIdx] = useState(0);
  const [draws, setDraws] = useState<AdminDraw[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDraw | null>(null);
  const [deleting, setDeleting] = useState(false);

  const group = SOURCE_GROUPS[groupIdx];

  // Inline add-row form
  const [addSource, setAddSource] = useState(group.addSource);
  const [eventNumber, setEventNumber] = useState("");
  const [date, setDate] = useState("");
  const [n, setN] = useState<NumRow>(emptyRow());
  const [hasMachine, setHasMachine] = useState(false);
  const [m, setM] = useState<NumRow>(emptyRow());
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string, grp: SourceGroup, off: number) => {
    setLoading(true); setError(null);
    try {
      const res = await fetchAdminDraws(t, { sources: grp.sources.join(","), limit: PAGE_SIZE, offset: off });
      setDraws(res.draws); setTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token, group, offset); }, [token, group, offset, load]);

  function switchGroup(idx: number) {
    setGroupIdx(idx);
    setAddSource(SOURCE_GROUPS[idx].addSource);
    setOffset(0);
    setAddError(null);
    setAddSuccess(null);
  }

  function setNAt(i: number, val: string) {
    const next = [...n] as NumRow; next[i] = val; setN(next);
  }
  function setMAt(i: number, val: string) {
    const next = [...m] as NumRow; next[i] = val; setM(next);
  }

  function resetForm() {
    setEventNumber(""); setDate(""); setN(emptyRow()); setHasMachine(false); setM(emptyRow());
    setAddError(null);
  }

  const canAdd =
    eventNumber.trim() !== "" &&
    date !== "" &&
    n.every((v) => v.trim() !== "") &&
    (!hasMachine || m.every((v) => v.trim() !== ""));

  async function handleAdd() {
    if (!token || !canAdd) return;
    setAdding(true); setAddError(null); setAddSuccess(null);
    try {
      const body: AdminDrawCreate = {
        source: addSource,
        event_number: Number(eventNumber),
        date,
        n_numbers: n.map(Number),
        ...(hasMachine ? { m_numbers: m.map(Number) } : {}),
      };
      await addAdminDraw(token, body);
      setAddSuccess(`Draw #${eventNumber} added (${addSource}).`);
      resetForm();
      await load(token, group, 0);
      setOffset(0);
    } catch (e: any) { setAddError(e.message); }
    finally { setAdding(false); }
  }

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminDraw(token, deleteTarget.id);
      setDraws((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((p) => p - 1);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <>
      {deleteTarget && (
        <DeleteModal draw={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4">
        <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
          <span>Admin</span>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          <span className="text-gray-900 dark:text-white font-medium">Draws</span>
        </nav>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Draws</h1>
      </div>

      {/* Source tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        <div className="flex min-w-max">
          {SOURCE_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => switchGroup(i)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                groupIdx === i
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline add-draw form */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Add new draw — {group.label}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          {/* Sub-source selector (only shown for multi-source groups) */}
          {group.sources.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Source</label>
              <select
                className={selectInput}
                value={addSource}
                onChange={(e) => setAddSource(e.target.value)}
              >
                {group.sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Event number */}
          <div className="w-24">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Event #</label>
            <input
              type="number"
              className={numInput}
              value={eventNumber}
              onChange={(e) => setEventNumber(e.target.value)}
              placeholder="e.g. 1234"
              min={1}
            />
          </div>

          {/* Date */}
          <div className="w-36">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              className={numInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* N1–N5 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">N1 – N5</label>
            <div className="flex gap-1">
              {n.map((v, i) => (
                <input
                  key={i}
                  type="number"
                  className={`${numInput} w-12`}
                  value={v}
                  min={1} max={90}
                  onChange={(e) => setNAt(i, e.target.value)}
                  placeholder={`${i + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Machine toggle + M1–M5 */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={hasMachine}
                  onChange={(e) => setHasMachine(e.target.checked)}
                  className="h-3.5 w-3.5 accent-amber-500"
                />
                M1 – M5
              </span>
            </label>
            {hasMachine && (
              <div className="flex gap-1">
                {m.map((v, i) => (
                  <input
                    key={i}
                    type="number"
                    className={`${numInput} w-12 border-amber-400 dark:border-amber-600`}
                    value={v}
                    min={1} max={90}
                    onChange={(e) => setMAt(i, e.target.value)}
                    placeholder={`${i + 1}`}
                  />
                ))}
              </div>
            )}
            {!hasMachine && (
              <div className="h-[34px] flex items-center">
                <span className="text-xs text-gray-400 dark:text-gray-500 italic">not included</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleAdd}
            disabled={adding || !canAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adding ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
            {adding ? "Adding..." : "Add Draw"}
          </button>

          {(eventNumber || date || n.some(Boolean)) && !adding && (
            <button onClick={resetForm} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              Clear
            </button>
          )}
        </div>

        {addError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{addError}</p>}
        {addSuccess && <p className="mt-2 text-sm text-green-600 dark:text-green-400">{addSuccess}</p>}
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
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Draw Numbers</th>
              <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Machine</th>
              <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {!loading && <span className="font-normal text-gray-400">{total.toLocaleString()} draws</span>}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : draws.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  No draws for {group.label} yet.
                </td>
              </tr>
            ) : draws.map((draw) => (
              <tr key={draw.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="p-4 whitespace-nowrap">
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">#{draw.event_number}</span>
                </td>
                <td className="p-4 whitespace-nowrap">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{draw.source}</span>
                </td>
                <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                  {draw.date?.slice(0, 10)}
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {[draw.N1, draw.N2, draw.N3, draw.N4, draw.N5].map((num, i) => <NumberBall key={i} n={num} type="N" />)}
                  </div>
                </td>
                <td className="p-4">
                  {draw.M1 != null ? (
                    <div className="flex items-center gap-1">
                      {[draw.M1, draw.M2, draw.M3, draw.M4, draw.M5].map((num, i) => <NumberBall key={i} n={num} type="M" />)}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                  )}
                </td>
                <td className="p-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => setDeleteTarget(draw)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="sticky bottom-0 w-full flex items-center justify-between border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{offset + 1}–{Math.min(offset + PAGE_SIZE, total)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
          </span>
          <div className="flex items-center gap-3">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              ← Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} / {totalPages}</span>
            <button disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Next →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
