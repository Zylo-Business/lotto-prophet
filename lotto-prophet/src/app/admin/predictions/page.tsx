"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAdminPredictions, createAdminPrediction, updateAdminPrediction, deleteAdminPrediction,
  type AdminPrediction, type AdminPredictionInput,
} from "@/lib/admin";

const GAME_OPTIONS = [
  "national", "midwk", "lucky", "bonanza", "fortune", "msp", "aseda",
  "FRI_RUSH", "MON_RUSH", "SAT_RUSH", "THURS_RUSH", "TUE_RUSH", "WED_RUSH",
  "alpha m", "delta", "excel", "kenstar", "omega", "precise", "prime",
  "one monday", "one tuesday", "one wednesday", "one friday", "one saturday", "one sunday", "one excel",
  "express monday", "express tuesday", "express wednesday", "express friday", "express saturday", "express sunday", "express excel",
];

const MIN_NUMS = 2;
const MAX_NUMS = 10;

const numCls = "w-12 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-1.5 py-1.5 text-sm text-center text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums";

function parseNumList(json: string | null | undefined): string[] {
  if (!json) return ["", ""];
  try { const arr = JSON.parse(json); return Array.isArray(arr) && arr.length >= MIN_NUMS ? arr.map(String) : ["", ""]; }
  catch { return ["", ""]; }
}

function PredictionForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: AdminPrediction | null;
  onSave: (data: AdminPredictionInput) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [gameName, setGameName] = useState(initial?.game_name ?? GAME_OPTIONS[0]);
  const [drawDate, setDrawDate] = useState(initial?.draw_date?.slice(0, 10) ?? "");
  const [nums, setNums] = useState<string[]>(() => parseNumList(initial?.numbers));
  const [hasMachine, setHasMachine] = useState(!!initial?.machine_numbers);
  const [mNums, setMNums] = useState<string[]>(() => parseNumList(initial?.machine_numbers));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isPublished, setIsPublished] = useState(initial ? initial.is_published === 1 : true);
  const [predType, setPredType] = useState<"free" | "paid">(initial?.prediction_type ?? "free");
  const [price, setPrice] = useState(initial?.price ? String(initial.price) : "");

  const setNum = (arr: string[], setArr: (v: string[]) => void, i: number, v: string) => {
    const next = [...arr]; next[i] = v; setArr(next);
  };
  const addNum = (arr: string[], setArr: (v: string[]) => void) => {
    if (arr.length < MAX_NUMS) setArr([...arr, ""]);
  };
  const removeNum = (arr: string[], setArr: (v: string[]) => void, i: number) => {
    if (arr.length > MIN_NUMS) setArr(arr.filter((_, idx) => idx !== i));
  };

  const numsValid = nums.length >= MIN_NUMS && nums.length <= MAX_NUMS && nums.every(v => v.trim() !== "");
  const mNumsValid = !hasMachine || (mNums.length >= MIN_NUMS && mNums.length <= MAX_NUMS && mNums.every(v => v.trim() !== ""));
  const canSave = !!(title.trim() && gameName && drawDate && numsValid && mNumsValid &&
    (predType === "free" || (price.trim() !== "" && parseFloat(price) > 0)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    await onSave({
      title: title.trim(),
      game_name: gameName,
      draw_date: drawDate,
      numbers: nums.map(Number),
      machine_numbers: hasMachine ? mNums.map(Number) : null,
      notes: notes.trim() || undefined,
      is_published: isPublished,
      prediction_type: predType,
      price: predType === "paid" ? parseFloat(price) : 0,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title</label>
          <input className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. National Lotto Prediction" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Game</label>
          <select className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={gameName} onChange={e => setGameName(e.target.value)}>
            {GAME_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Draw Date</label>
          <input type="date" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={drawDate} onChange={e => setDrawDate(e.target.value)} />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
            Published (visible to users)
          </label>
        </div>
      </div>

      {/* Prediction type */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Type:</span>
        <button type="button" onClick={() => setPredType("free")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${predType === "free" ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-900/40 dark:border-green-600 dark:text-green-300" : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-green-300"}`}>
          Free
        </button>
        <button type="button" onClick={() => setPredType("paid")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${predType === "paid" ? "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/40 dark:border-amber-600 dark:text-amber-300" : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-amber-300"}`}>
          Paid
        </button>
        {predType === "paid" && (
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Price (GHS):</span>
            <input type="number" min="0.01" step="0.01"
              className="w-24 rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 tabular-nums"
              value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Predicted Numbers ({nums.length}/{MAX_NUMS})
          </label>
          {nums.length < MAX_NUMS && (
            <button type="button" onClick={() => addNum(nums, setNums)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">+ Add number</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {nums.map((v, i) => (
            <div key={i} className="flex items-center gap-1">
              <input type="number" className={numCls} min={1} max={90} value={v}
                onChange={e => setNum(nums, setNums, i, e.target.value)} placeholder={`N${i + 1}`} />
              {nums.length > 1 && (
                <button type="button" onClick={() => removeNum(nums, setNums, i)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none">✕</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 cursor-pointer">
          <input type="checkbox" className="h-3.5 w-3.5 accent-amber-500" checked={hasMachine} onChange={e => setHasMachine(e.target.checked)} />
          Machine Numbers ({hasMachine ? `${mNums.length}/${MAX_NUMS}` : `0/${MAX_NUMS}`})
        </label>
        {hasMachine && (
          <div>
            {mNums.length < MAX_NUMS && (
              <button type="button" onClick={() => addNum(mNums, setMNums)}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline mb-1 block">+ Add number</button>
            )}
            <div className="flex flex-wrap gap-2">
              {mNums.map((v, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="number" className={`${numCls} border-amber-400 dark:border-amber-600`} min={1} max={90} value={v}
                    onChange={e => setNum(mNums, setMNums, i, e.target.value)} placeholder={`M${i + 1}`} />
                  {mNums.length > 1 && (
                    <button type="button" onClick={() => removeNum(mNums, setMNums, i)}
                      className="text-gray-400 hover:text-red-500 transition-colors text-xs leading-none">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Notes (optional)</label>
        <textarea className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Analysis notes or reasoning…" />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving || !canSave}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? "Saving…" : initial ? "Save Changes" : "Create Prediction"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AdminPredictionsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<AdminPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminPrediction | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminPrediction | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const load = useCallback(async (t: string) => {
    setLoading(true); setError(null);
    try { setPredictions(await fetchAdminPredictions(t)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) load(token); }, [token, load]);

  async function handleSave(data: AdminPredictionInput) {
    if (!token) return;
    setSaving(true);
    try {
      if (editTarget) {
        const updated = await updateAdminPrediction(token, editTarget.id, data);
        setPredictions(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createAdminPrediction(token, data);
        setPredictions(prev => [created, ...prev]);
      }
      setShowForm(false); setEditTarget(null);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(pred: AdminPrediction) {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteAdminPrediction(token, pred.id);
      setPredictions(prev => prev.filter(p => p.id !== pred.id));
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  function openCreate() { setEditTarget(null); setShowForm(true); }
  function openEdit(p: AdminPrediction) { setEditTarget(p); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditTarget(null); }

  return (
    <>
      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 shadow-xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Delete prediction?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">"{deleteTarget.title}" will be removed permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteTarget)} disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            <span>Admin</span>
            <span>›</span>
            <span className="text-gray-700 dark:text-gray-200">Predictions</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Predictions</h1>
        </div>
        {!showForm && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Prediction
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

        {/* Create / Edit form */}
        {showForm && (
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              {editTarget ? "Edit Prediction" : "New Prediction"}
            </h2>
            <PredictionForm initial={editTarget} onSave={handleSave} onCancel={cancelForm} saving={saving} />
          </div>
        )}

        {/* Predictions list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-700 animate-pulse" />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">No predictions yet. Create one to display on the home dashboard.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title / Game</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Draw Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Numbers</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {predictions.map(p => {
                  let nums: number[] = [];
                  let mNums: number[] = [];
                  try { nums = JSON.parse(p.numbers); } catch {}
                  try { if (p.machine_numbers) mNums = JSON.parse(p.machine_numbers); } catch {}
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.game_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                        {p.draw_date?.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {nums.map((n, i) => (
                            <span key={i} className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-xs font-bold text-indigo-700 dark:text-indigo-300">{n}</span>
                          ))}
                          {mNums.length > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>}
                          {mNums.map((n, i) => (
                            <span key={i} className="inline-flex w-7 h-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 text-xs font-bold text-amber-700 dark:text-amber-300">{n}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold w-fit ${
                            p.prediction_type === "paid"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}>
                            {p.prediction_type === "paid" ? "Paid" : "Free"}
                          </span>
                          {p.prediction_type === "paid" && (
                            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">GHS {Number(p.price).toFixed(2)}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.is_published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                        }`}>
                          {p.is_published ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(p)}
                            className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                            Edit
                          </button>
                          <button onClick={() => setDeleteTarget(p)}
                            className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
