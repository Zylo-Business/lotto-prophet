"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAdminGroups, deleteAdminGroup, fetchAdminPosts, deleteAdminPost,
  type AdminGroup, type AdminPost,
} from "@/lib/admin";

const PAGE_SIZE = 50;
type Tab = "groups" | "posts";

function DeleteModal({ title, subtitle, onConfirm, onCancel }: { title: string; subtitle: string; onConfirm: () => void; onCancel: () => void }) {
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}<br />This action cannot be undone.</p>
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

function Pagination({ offset, total, pageSize, onPrev, onNext }: { offset: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void }) {
  const totalPages = Math.ceil(total / pageSize);
  const currentPage = Math.floor(offset / pageSize) + 1;
  if (totalPages <= 1) return null;
  return (
    <div className="sticky bottom-0 right-0 w-full items-center border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex sm:justify-between">
      <div className="mb-3 flex items-center sm:mb-0">
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{offset + 1}–{Math.min(offset + pageSize, total)}</span> of <span className="font-semibold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={offset === 0} onClick={onPrev}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
          <svg className="mr-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Previous
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} / {totalPages}</span>
        <button disabled={offset + pageSize >= total} onClick={onNext}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
          Next
          <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function AdminCommunityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("groups");

  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [groupsTotal, setGroupsTotal] = useState(0);
  const [groupsOffset, setGroupsOffset] = useState(0);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsOffset, setPostsOffset] = useState(0);
  const [postsLoading, setPostsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: Tab; label: string; sublabel: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const loadGroups = useCallback(async (t: string, off: number) => {
    setGroupsLoading(true); setError(null);
    try {
      const res = await fetchAdminGroups(t, { limit: PAGE_SIZE, offset: off });
      setGroups(res.groups); setGroupsTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setGroupsLoading(false); }
  }, []);

  const loadPosts = useCallback(async (t: string, off: number) => {
    setPostsLoading(true); setError(null);
    try {
      const res = await fetchAdminPosts(t, { limit: PAGE_SIZE, offset: off });
      setPosts(res.posts); setPostsTotal(res.total);
    } catch (e: any) { setError(e.message); }
    finally { setPostsLoading(false); }
  }, []);

  useEffect(() => { if (token) loadGroups(token, groupsOffset); }, [token, groupsOffset, loadGroups]);
  useEffect(() => { if (token) loadPosts(token, postsOffset); }, [token, postsOffset, loadPosts]);

  async function handleDelete() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "groups") {
        await deleteAdminGroup(token, deleteTarget.id);
        setGroups(prev => prev.filter(g => g.id !== deleteTarget.id));
        setGroupsTotal(p => p - 1);
      } else {
        await deleteAdminPost(token, deleteTarget.id);
        setPosts(prev => prev.filter(p => p.id !== deleteTarget.id));
        setPostsTotal(p => p - 1);
      }
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); setDeleteTarget(null); }
  }

  return (
    <>
      {deleteTarget && (
        <DeleteModal
          title={`Delete ${deleteTarget.type === "groups" ? "Group" : "Post"}?`}
          subtitle={deleteTarget.label + (deleteTarget.sublabel ? ` — ${deleteTarget.sublabel}` : "")}
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
            <span className="text-gray-900 dark:text-white font-medium">Community</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Community</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["groups", "posts"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${tab === t
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>
              {t === "groups" ? `Groups (${groupsTotal})` : `Posts (${postsTotal})`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Groups table */}
      {tab === "groups" && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Owner</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Members</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Posts</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {groupsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : groups.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">No groups found.</td></tr>
                ) : groups.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{g.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{g.description}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">{g.firstname} {g.surname}</td>
                    <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{g.member_count}</td>
                    <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{g.post_count}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${g.is_private ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`}>
                        {g.is_private ? "Private" : "Public"}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <button onClick={() => setDeleteTarget({ id: g.id, type: "groups", label: g.name, sublabel: `${g.member_count} members` })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination offset={groupsOffset} total={groupsTotal} pageSize={PAGE_SIZE}
            onPrev={() => setGroupsOffset(Math.max(0, groupsOffset - PAGE_SIZE))}
            onNext={() => setGroupsOffset(groupsOffset + PAGE_SIZE)} />
        </>
      )}

      {/* Posts table */}
      {tab === "posts" && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Title</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">Author</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">Group</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Comments</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                {postsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="p-4"><div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" /></td>
                    ))}</tr>
                  ))
                ) : posts.length === 0 ? (
                  <tr><td colSpan={6} className="p-12 text-center text-sm text-gray-500 dark:text-gray-400">No posts found.</td></tr>
                ) : posts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white max-w-[200px] truncate">{p.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden sm:table-cell">{p.firstname} {p.surname}</td>
                    <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 hidden md:table-cell">{p.group_name}</td>
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 capitalize">
                        {p.post_type}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">{p.comment_count}</td>
                    <td className="p-4 whitespace-nowrap text-right">
                      <button onClick={() => setDeleteTarget({ id: p.id, type: "posts", label: p.title, sublabel: `${p.firstname} ${p.surname}` })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination offset={postsOffset} total={postsTotal} pageSize={PAGE_SIZE}
            onPrev={() => setPostsOffset(Math.max(0, postsOffset - PAGE_SIZE))}
            onNext={() => setPostsOffset(postsOffset + PAGE_SIZE)} />
        </>
      )}
    </>
  );
}
