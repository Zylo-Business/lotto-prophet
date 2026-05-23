"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  fetchCommunityGroups,
  fetchFeed,
  fetchTrending,
  fetchPostComments,
  fetchGroupDetails,
  createCommunityGroup,
  joinCommunityGroup,
  createGroupPost,
  updateGroupPost,
  deleteGroupPost,
  updateGroup,
  removeMember,
  createPostComment,
  updatePostComment,
  promoteMember,
  demoteMember,
  likePost,
  unlikePost,
  type CommunityGroup,
  type CommunityPost,
  type PostComment,
  type CommunityMember,
} from "@/lib/community";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const MAX_CHARS = 500;
const BODY_LIMIT = 260;

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

const PALETTE = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6"];
function avatarColor(id: number) { return PALETTE[id % PALETTE.length]; }

function highlightHashtags(text: string) {
  return text.split(/(#\w+)/g).map((p, i) =>
    p.startsWith("#")
      ? <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium">{p}</span>
      : p
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ userId, first, last, avatarUrl, size = 42 }: {
  userId: number; first: string; last: string; avatarUrl?: string | null; size?: number;
}) {
  const bg = avatarColor(userId);
  if (avatarUrl) {
    return (
      <div className="rounded-full overflow-hidden shrink-0 relative" style={{ width: size, height: size }}>
        <Image src={`${API_URL}${avatarUrl}`} alt="" fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {initials(first, last)}
    </div>
  );
}

// ── PostCard ──────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, onLike, onUnlike, onPostUpdated, onDelete }: {
  post: CommunityPost;
  currentUserId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onPostUpdated: (p: CommunityPost) => void;
  onDelete: (p: CommunityPost) => void;
}) {
  const liked = post.liked_by_me === 1;
  const isOwner = currentUserId !== undefined && post.user_id === currentUserId;
  const canModerate = ["owner", "moderator"].includes(post.my_group_role ?? "");
  const canDelete = isOwner || canModerate;
  const imageUrls: string[] = post.image_urls ?? (post.image_url ? [post.image_url] : []);

  const [bodyExpanded, setBodyExpanded] = useState(false);
  const bodyTruncated = !bodyExpanded && post.body.length > BODY_LIMIT;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editType, setEditType] = useState<"discussion" | "forecast">(post.post_type);
  const [editNums, setEditNums] = useState(post.predicted_numbers ?? "");
  const [editImages, setEditImages] = useState<File[]>([]);
  const [editPreviews, setEditPreviews] = useState<string[]>([]);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const editImageRef = useRef<HTMLInputElement>(null);

  const commentCount = Number(post.comment_count ?? 0);

  function openEdit() {
    setEditTitle(post.title); setEditBody(post.body); setEditType(post.post_type);
    setEditNums(post.predicted_numbers ?? ""); setEditImages([]); setEditPreviews([]); setEditErr(null);
    setEditOpen(true);
  }

  function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const sel = Array.from(e.target.files ?? []);
    if (!sel.length) return;
    setEditImages((p) => [...p, ...sel].slice(0, 5));
    setEditPreviews((p) => [...p, ...sel.map((f) => URL.createObjectURL(f))].slice(0, 5));
    e.target.value = "";
  }

  async function submitEdit() {
    if (!editTitle.trim()) { setEditErr("Title is required"); return; }
    if (!editBody.trim()) { setEditErr("Body is required"); return; }
    if (editBody.length > MAX_CHARS) { setEditErr(`Max ${MAX_CHARS} chars`); return; }
    try {
      setEditSubmitting(true); setEditErr(null);
      const updated = await updateGroupPost(post.id, {
        title: editTitle.trim(), body: editBody.trim(), post_type: editType,
        predicted_numbers: editNums.trim() || undefined,
        images: editImages.length > 0 ? editImages : undefined,
      });
      onPostUpdated(updated); setEditOpen(false);
    } catch (e: any) { setEditErr(e.message); }
    finally { setEditSubmitting(false); }
  }

  async function toggleComments() {
    if (!commentsOpen && comments.length === 0) {
      setCommentsLoading(true);
      try { setComments(await fetchPostComments(post.id)); } catch { /* silent */ }
      finally { setCommentsLoading(false); }
    }
    setCommentsOpen((v) => !v);
  }

  async function submitComment() {
    const body = commentInput.trim();
    if (!body) return;
    setSubmittingComment(true);
    try {
      await createPostComment(post.id, body);
      setCommentInput("");
      setComments(await fetchPostComments(post.id));
    } catch { /* silent */ }
    finally { setSubmittingComment(false); }
  }

  async function saveCommentEdit(commentId: number) {
    const body = editCommentBody.trim();
    if (!body) return;
    setSavingComment(true);
    try {
      const updated = await updatePostComment(post.id, commentId, body);
      setComments((p) => p.map((c) => c.id === commentId ? { ...c, body: updated.body } : c));
      setEditingCommentId(null);
    } catch { /* silent */ }
    finally { setSavingComment(false); }
  }

  return (
    <>
      {/* Post row — Mastodon border-separated style */}
      <article className="px-4 py-4 hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0">
        <div className="flex gap-3">
          {/* Avatar column */}
          <Avatar userId={post.user_id} first={post.firstname} last={post.surname} avatarUrl={post.avatar_url} />

          {/* Content column */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span className="font-semibold text-sm text-foreground leading-tight">
                  {post.firstname} {post.surname}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                {post.group_name && (
                  <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-4">
                    {post.group_name}
                  </Badge>
                )}
                {post.post_type === "forecast" && (
                  <Badge className="text-[11px] px-1.5 py-0 h-4 bg-amber-500 hover:bg-amber-500 text-white">
                    Forecast
                  </Badge>
                )}
                {(post as any).is_pinned === 1 && (
                  <span className="text-[11px] text-muted-foreground">📌</span>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {isOwner && (
                  <button onClick={openEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => onDelete(post)} className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Delete">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Title */}
            <p className="text-sm font-semibold text-foreground leading-snug mb-1.5">{post.title}</p>

            {/* Body */}
            <div className="text-sm text-foreground/85 leading-relaxed mb-2.5">
              {highlightHashtags(bodyTruncated ? post.body.slice(0, BODY_LIMIT) + "…" : post.body)}
              {post.body.length > BODY_LIMIT && (
                <button onClick={() => setBodyExpanded((v) => !v)} className="ml-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:underline">
                  {bodyExpanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>

            {/* Image grid */}
            {imageUrls.length > 0 && (
              <div className={`mb-2.5 grid gap-1 rounded-xl overflow-hidden ${imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {imageUrls.slice(0, 4).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIndex(i)}
                    className={`relative bg-muted group overflow-hidden ${imageUrls.length === 1 ? "h-64" : "h-40"} ${
                      imageUrls.length === 3 && i === 0 ? "row-span-2" : ""
                    }`}
                  >
                    <Image src={`${API_URL}${url}`} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-200" unoptimized />
                    {i === 3 && imageUrls.length > 4 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xl font-bold">+{imageUrls.length - 4}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Predicted numbers */}
            {post.predicted_numbers && (
              <p className="text-xs text-muted-foreground mb-2">🔢 {post.predicted_numbers}</p>
            )}

            {/* Action bar */}
            <div className="flex items-center gap-5 mt-1">
              {/* Comment */}
              <button
                onClick={toggleComments}
                className={`flex items-center gap-1.5 text-xs transition-colors group ${commentsOpen ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"}`}
              >
                <span className="p-1.5 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </span>
                <span className="font-medium">{commentCount}</span>
              </button>

              {/* Like */}
              <button
                onClick={() => liked ? onUnlike(post.id) : onLike(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors group ${liked ? "text-rose-500" : "text-muted-foreground"}`}
              >
                <span className="p-1.5 rounded-full group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                  <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </span>
                <span className="font-medium">{Number(post.like_count ?? 0)}</span>
              </button>
            </div>

            {/* Comments drawer */}
            {commentsOpen && (
              <div className="mt-3 space-y-2.5 border-t border-border/40 pt-3">
                {commentsLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2 items-start">
                    <Avatar userId={c.user_id} first={c.firstname} last={c.surname} avatarUrl={c.avatar_url} size={26} />
                    <div className="flex-1 min-w-0 bg-muted/50 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{c.firstname} {c.surname}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                        {currentUserId === c.user_id && editingCommentId !== c.id && (
                          <button onClick={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }} className="ml-auto text-muted-foreground hover:text-foreground">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {editingCommentId === c.id ? (
                        <div className="flex gap-1.5 items-center mt-1">
                          <input autoFocus value={editCommentBody} onChange={(e) => setEditCommentBody(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveCommentEdit(c.id); } if (e.key === "Escape") setEditingCommentId(null); }}
                            className="flex-1 text-xs border border-indigo-400 rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none" />
                          <button onClick={() => saveCommentEdit(c.id)} disabled={savingComment || !editCommentBody.trim()} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40">{savingComment ? "…" : "Save"}</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-muted-foreground">Cancel</button>
                        </div>
                      ) : (
                        <p className="text-xs text-foreground/90 leading-relaxed">{c.body}</p>
                      )}
                    </div>
                  </div>
                ))}
                {comments.length === 0 && !commentsLoading && (
                  <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
                )}
                <div className="flex gap-2 items-center pt-1">
                  <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    placeholder="Add a comment…"
                    className="flex-1 text-xs border border-input rounded-full px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                  <button onClick={submitComment} disabled={submittingComment || !commentInput.trim()} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-40 shrink-0">
                    {submittingComment ? "…" : "Post"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </article>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setEditOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Edit Post</h2>
            <div className="flex gap-2">
              {(["discussion", "forecast"] as const).map((t) => (
                <button key={t} onClick={() => setEditType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${editType === t ? "bg-indigo-600 border-indigo-600 text-white" : "border-muted text-muted-foreground hover:border-indigo-400"}`}>
                  {t === "discussion" ? "💬 Discussion" : "🔢 Forecast"}
                </button>
              ))}
            </div>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Post title…"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div className="relative">
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={5} placeholder="Post body…"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <span className={`absolute bottom-2.5 right-3 text-xs ${MAX_CHARS - editBody.length < 0 ? "text-red-500" : "text-muted-foreground"}`}>{MAX_CHARS - editBody.length}</span>
            </div>
            {editType === "forecast" && (
              <input value={editNums} onChange={(e) => setEditNums(e.target.value)} placeholder="Predicted numbers (e.g. 3, 17, 22)"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            )}
            <div className="space-y-2">
              {editPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editPreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image src={src} alt="" fill className="object-cover" unoptimized />
                      </div>
                      <button onClick={() => { setEditImages((p) => p.filter((_, j) => j !== i)); setEditPreviews((p) => p.filter((_, j) => j !== i)); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold hover:bg-red-500 hover:text-white">×</button>
                    </div>
                  ))}
                </div>
              )}
              {editImages.length < 5 && (
                <button type="button" onClick={() => editImageRef.current?.click()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {editImages.length === 0 ? (imageUrls.length > 0 ? "Replace photos" : "Add photos (up to 5)") : `Add more (${5 - editImages.length} left)`}
                </button>
              )}
              <input ref={editImageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleEditImageSelect} />
            </div>
            {editErr && <p className="text-xs text-destructive">{editErr}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" disabled={editSubmitting || MAX_CHARS - editBody.length < 0} onClick={submitEdit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4" onClick={() => setLightboxIndex(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 z-10" onClick={() => setLightboxIndex(null)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          {imageUrls.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/40 rounded-full px-3 py-1 z-10">
              {lightboxIndex + 1} / {imageUrls.length}
            </div>
          )}
          {lightboxIndex > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full p-3 z-10" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image src={`${API_URL}${imageUrls[lightboxIndex]}`} alt="" fill className="object-contain" unoptimized />
          </div>
          {lightboxIndex < imageUrls.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full p-3 z-10" onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ── Composer ──────────────────────────────────────────────────────────────────

function Composer({ groups, selectedGroupId, currentUserId, currentUserFirstname, onPost }: {
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  currentUserId?: number;
  currentUserFirstname?: string;
  onPost: (groupId: number, title: string, body: string, type: "discussion" | "forecast", nums: string, images?: File[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [groupId, setGroupId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<"discussion" | "forecast">("discussion");
  const [numbers, setNumbers] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const myGroups = groups.filter((g) => g.is_member);
  const charsLeft = MAX_CHARS - body.length;

  useEffect(() => {
    if (!expanded) return;
    if (selectedGroupId && myGroups.find((g) => g.id === selectedGroupId)) {
      setGroupId(selectedGroupId);
    } else if (myGroups.length === 1) {
      setGroupId(myGroups[0].id);
    }
  }, [expanded, selectedGroupId]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const sel = Array.from(e.target.files ?? []);
    if (!sel.length) return;
    setImageFiles((p) => [...p, ...sel].slice(0, 5));
    setImagePreviews((p) => [...p, ...sel.map((f) => URL.createObjectURL(f))].slice(0, 5));
    e.target.value = "";
  }

  function reset() {
    setExpanded(false); setTitle(""); setBody(""); setNumbers("");
    setPostType("discussion"); setImageFiles([]); setImagePreviews([]); setErr(null);
  }

  async function submit() {
    if (!groupId) { setErr("Select a group"); return; }
    if (!title.trim()) { setErr("Title is required"); return; }
    if (!body.trim()) { setErr("Write something"); return; }
    if (body.length > MAX_CHARS) { setErr(`Max ${MAX_CHARS} characters`); return; }
    try {
      setSubmitting(true); setErr(null);
      await onPost(Number(groupId), title.trim(), body.trim(), postType, numbers.trim(), imageFiles.length > 0 ? imageFiles : undefined);
      reset();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const uid = currentUserId ?? 0;
  const uname = currentUserFirstname ?? "?";

  return (
    <div className="border-b border-border/60 px-4 py-3">
      {!expanded ? (
        <div className="flex items-center gap-3 cursor-text" onClick={() => setExpanded(true)}>
          <Avatar userId={uid} first={uname} last="" avatarUrl={null} size={40} />
          <div className="flex-1 h-10 rounded-full border border-input bg-muted/40 flex items-center px-4 text-sm text-muted-foreground hover:border-indigo-400 transition-colors">
            What&apos;s on your mind?
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <Avatar userId={uid} first={uname} last="" avatarUrl={null} size={40} />
            <div className="flex-1 space-y-2.5">
              <select value={groupId} onChange={(e) => setGroupId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select group…</option>
                {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <div className="flex gap-2">
                {(["discussion", "forecast"] as const).map((t) => (
                  <button key={t} onClick={() => setPostType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${postType === t ? "bg-indigo-600 border-indigo-600 text-white" : "border-muted text-muted-foreground hover:border-indigo-400"}`}>
                    {t === "discussion" ? "💬 Discussion" : "🔢 Forecast"}
                  </button>
                ))}
              </div>

              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title…"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />

              <div className="relative">
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4}
                  placeholder="Share your thoughts… use #hashtags"
                  className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                <span className={`absolute bottom-2.5 right-3 text-xs ${charsLeft < 0 ? "text-red-500" : charsLeft < 50 ? "text-amber-500" : "text-muted-foreground"}`}>{charsLeft}</span>
              </div>

              {postType === "forecast" && (
                <input value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder="Predicted numbers (e.g. 3, 17, 22)"
                  className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}

              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden"><Image src={src} alt="" fill className="object-cover" unoptimized /></div>
                      <button onClick={() => { setImageFiles((p) => p.filter((_, j) => j !== i)); setImagePreviews((p) => p.filter((_, j) => j !== i)); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold hover:bg-red-500 hover:text-white">×</button>
                    </div>
                  ))}
                </div>
              )}

              {err && <p className="text-xs text-destructive">{err}</p>}

              <div className="flex items-center justify-between pt-1">
                <button type="button" onClick={() => imageRef.current?.click()}
                  className={`flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${imageFiles.length >= 5 ? "opacity-40 pointer-events-none" : ""}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {imageFiles.length === 0 ? "Photos" : `${imageFiles.length}/5`}
                </button>
                <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset}>Cancel</Button>
                  <Button size="sm" disabled={submitting || charsLeft < 0} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {submitting ? "Posting…" : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Left Sidebar ──────────────────────────────────────────────────────────────

function GroupSidebar({ groups, selectedGroupId, onSelect, onJoin, onCreateClick, onManageMembers }: {
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  onSelect: (id: number | null) => void;
  onJoin: (id: number) => void;
  onCreateClick: () => void;
  onManageMembers: (g: CommunityGroup) => void;
}) {
  return (
    <nav className="space-y-0.5">
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Groups</h2>
        <button onClick={onCreateClick} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">+ New</button>
      </div>

      <button onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedGroupId === null ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "text-foreground hover:bg-muted"}`}>
        <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">🏠</span>
        <span className="flex-1 truncate">Home Feed</span>
      </button>

      {groups.map((g) => {
        const active = selectedGroupId === g.id;
        return (
          <div key={g.id} className="flex items-center gap-1">
            <button onClick={() => g.is_member ? onSelect(g.id) : onJoin(g.id)}
              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors min-w-0 ${active ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium" : "text-foreground hover:bg-muted"}`}>
              <span
                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: avatarColor(g.id) }}
              >
                {g.name[0]?.toUpperCase()}
              </span>
              <span className="flex-1 truncate">{g.name}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                {g.member_count !== undefined && <span className="text-xs text-muted-foreground">{g.member_count}</span>}
                {g.is_private === 1 && <span className="text-xs text-muted-foreground">🔒</span>}
                {!g.is_member && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">Join</span>}
              </div>
            </button>
            {g.my_role === "owner" && (
              <button onClick={() => onManageMembers(g)} title="Manage" className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            )}
          </div>
        );
      })}

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-6 px-3">No groups yet. Create or join one!</p>
      )}
    </nav>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ trending, groups, onJoin }: {
  trending: CommunityPost[];
  groups: CommunityGroup[];
  onJoin: (id: number) => void;
}) {
  const discover = groups.filter((g) => !g.is_member).slice(0, 5);
  return (
    <div className="space-y-4">
      {trending.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-border/40">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trending this week</p>
          </div>
          <div className="divide-y divide-border/40">
            {trending.map((p, i) => (
              <div key={p.id} className="flex gap-3 items-start px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="text-base font-bold text-muted-foreground/30 w-5 shrink-0 pt-0.5">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>❤️ {Number(p.like_count ?? 0)}</span>
                    <span>💬 {Number(p.comment_count ?? 0)}</span>
                    {p.group_name && <><span>·</span><span className="truncate">{p.group_name}</span></>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {discover.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="px-4 pt-4 pb-2 border-b border-border/40">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Discover Groups</p>
          </div>
          <div className="divide-y divide-border/40">
            {discover.map((g) => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: avatarColor(g.id) }}>
                  {g.name[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground">{g.member_count ?? 0} members {g.is_private === 1 ? "· 🔒 Private" : ""}</p>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7 shrink-0 rounded-full" onClick={() => onJoin(g.id)}>Join</Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modals (CreateGroup, Join, Members) ───────────────────────────────────────

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: CommunityGroup) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try { setErr(null); setSubmitting(true); const g = await createCommunityGroup({ name, description, is_private: isPrivate, join_code: joinCode }); onCreate(g); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Create Group</h2>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name"
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
            Private group (join code required)
          </label>
          {isPrivate && (
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Join code (min 4 chars)"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          )}
          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">{submitting ? "Creating…" : "Create"}</Button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({ group, onClose, onJoined }: { group: CommunityGroup; onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try { setErr(null); setSubmitting(true); await joinCommunityGroup(group.id, group.is_private ? code : undefined); onJoined(); onClose(); }
    catch (e: any) { setErr(e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-1">Join {group.name}</h2>
        {group.is_private ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">This group is private. Enter the join code.</p>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Join code"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">This is a public group. Join to start posting!</p>
        )}
        {err && <p className="text-xs text-destructive mb-2">{err}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">{submitting ? "Joining…" : "Join"}</Button>
        </div>
      </div>
    </div>
  );
}

function MembersModal({ group, currentUserId, onClose, onGroupUpdated }: {
  group: CommunityGroup; currentUserId?: number; onClose: () => void; onGroupUpdated: (g: CommunityGroup) => void;
}) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description);
  const [editPrivate, setEditPrivate] = useState(group.is_private === 1);
  const [editCode, setEditCode] = useState(group.join_code ?? "");
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupErr, setGroupErr] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetails(group.id)
      .then((d) => setMembers(d.members))
      .catch(() => setActionErr("Failed to load members"))
      .finally(() => setLoading(false));
  }, [group.id]);

  async function saveGroup() {
    if (!editName.trim() || editName.trim().length < 3) { setGroupErr("Name must be ≥ 3 characters"); return; }
    if (editPrivate && editCode.trim().length < 4) { setGroupErr("Join code must be ≥ 4 characters"); return; }
    setSavingGroup(true); setGroupErr(null);
    try {
      const updated = await updateGroup(group.id, { name: editName.trim(), description: editDesc.trim(), is_private: editPrivate, join_code: editPrivate ? editCode.trim() : undefined });
      onGroupUpdated(updated); setEditOpen(false);
    } catch (e: any) { setGroupErr(e.message); }
    finally { setSavingGroup(false); }
  }

  async function promote(id: number) {
    setBusy(id); setActionErr(null);
    try { await promoteMember(group.id, id); setMembers((p) => p.map((m) => m.id === id ? { ...m, role: "moderator" } : m)); }
    catch (e: any) { setActionErr(e.message); } finally { setBusy(null); }
  }

  async function demote(id: number) {
    setBusy(id); setActionErr(null);
    try { await demoteMember(group.id, id); setMembers((p) => p.map((m) => m.id === id ? { ...m, role: "member" } : m)); }
    catch (e: any) { setActionErr(e.message); } finally { setBusy(null); }
  }

  async function remove(id: number) {
    if (!window.confirm("Remove this member?")) return;
    setBusy(id); setActionErr(null);
    try { await removeMember(group.id, id); setMembers((p) => p.filter((m) => m.id !== id)); }
    catch (e: any) { setActionErr(e.message); } finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-muted/50">
          <h2 className="text-lg font-bold truncate flex-1">{group.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setEditOpen((v) => !v); setGroupErr(null); setEditName(group.name); setEditDesc(group.description); setEditPrivate(group.is_private === 1); setEditCode(group.join_code ?? ""); }}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${editOpen ? "border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" : "border-muted text-muted-foreground hover:border-indigo-400"}`}>
              Edit group
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {editOpen && (
            <div className="space-y-2.5 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Edit Group</p>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Group name"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description (optional)" rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={editPrivate} onChange={(e) => setEditPrivate(e.target.checked)} className="rounded" />
                Private group
              </label>
              {editPrivate && (
                <input value={editCode} onChange={(e) => setEditCode(e.target.value)} placeholder="Join code (min 4 chars)"
                  className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              )}
              {groupErr && <p className="text-xs text-destructive">{groupErr}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditOpen(false)} className="text-xs text-muted-foreground hover:text-foreground px-2">Cancel</button>
                <Button size="sm" disabled={savingGroup} onClick={saveGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7">{savingGroup ? "Saving…" : "Save"}</Button>
              </div>
            </div>
          )}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Members ({members.length})</p>
          {actionErr && <p className="text-xs text-destructive">{actionErr}</p>}
          {loading ? <p className="text-sm text-muted-foreground text-center py-6">Loading…</p> : (
            <div className="space-y-1">
              {members.map((m) => {
                const isMe = m.id === currentUserId;
                const isOwnerM = m.role === "owner";
                const isMod = m.role === "moderator";
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ backgroundColor: avatarColor(m.id) }}>
                      {`${m.firstname[0] ?? ""}${m.surname[0] ?? ""}`.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.firstname} {m.surname}{isMe && <span className="text-muted-foreground font-normal"> (you)</span>}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role ?? "member"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isMe && !isOwnerM && (
                        <>
                          {isMod
                            ? <button disabled={busy === m.id} onClick={() => demote(m.id)} className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-40">{busy === m.id ? "…" : "Demote"}</button>
                            : <button disabled={busy === m.id} onClick={() => promote(m.id)} className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40">{busy === m.id ? "…" : "Make Mod"}</button>
                          }
                          <button disabled={busy === m.id} onClick={() => remove(m.id)} className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-rose-400 hover:text-rose-500 transition-colors disabled:opacity-40">{busy === m.id ? "…" : "Remove"}</button>
                        </>
                      )}
                      {isOwnerM && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">Owner</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Feed tab type ─────────────────────────────────────────────────────────────

type FeedTab = "home" | "trending" | "explore";

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [trending, setTrending] = useState<CommunityPost[]>([]);
  const [tab, setTab] = useState<FeedTab>("home");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [joinTarget, setJoinTarget] = useState<CommunityGroup | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);
  const [currentUserFirstname, setCurrentUserFirstname] = useState<string | undefined>(undefined);
  const [membersGroup, setMembersGroup] = useState<CommunityGroup | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setPageErr(null);
      const [g, f, t] = await Promise.all([
        fetchCommunityGroups(),
        fetchFeed(),
        fetchTrending().catch(() => [] as CommunityPost[]),
      ]);
      setGroups(g); setFeed(f); setTrending(t);
    } catch (e: any) {
      setPageErr(e.message || "Failed to load community");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/signin"); return; }
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUserId(u?.id);
        setCurrentUserFirstname(u?.firstname);
      }
    } catch { /* ignore */ }
    load();
  }, [router, load]);

  const homePosts = selectedGroupId ? feed.filter((p) => p.group_id === selectedGroupId) : feed;

  async function handleLike(id: number) {
    await likePost(id);
    setFeed((p) => p.map((x) => x.id === id ? { ...x, liked_by_me: 1, like_count: (Number(x.like_count) + 1) as any } : x));
  }

  async function handleUnlike(id: number) {
    await unlikePost(id);
    setFeed((p) => p.map((x) => x.id === id ? { ...x, liked_by_me: 0, like_count: (Math.max(0, Number(x.like_count) - 1)) as any } : x));
  }

  function handlePostUpdated(updated: CommunityPost) {
    setFeed((p) => p.map((x) => x.id === updated.id ? { ...x, ...updated } : x));
  }

  async function handlePost(groupId: number, title: string, body: string, type: "discussion" | "forecast", numbers: string, images?: File[]) {
    await createGroupPost(groupId, { title, body, post_type: type, predicted_numbers: numbers || undefined, images });
    await load();
  }

  async function handleDeletePost(post: CommunityPost) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try { await deleteGroupPost(post.group_id, post.id); setFeed((p) => p.filter((x) => x.id !== post.id)); }
    catch (e: any) { alert(e.message); }
  }

  function handleGroupCreated(g: CommunityGroup) {
    setGroups((p) => [{ ...g, is_member: 1, my_role: "owner", member_count: 1 }, ...p]);
  }

  function openJoinModal(id: number) {
    const g = groups.find((x) => x.id === id);
    if (g) setJoinTarget(g);
  }

  function handleSidebarSelect(id: number | null) {
    if (id !== null) {
      const g = groups.find((x) => x.id === id);
      if (g && !g.is_member) { openJoinModal(id); return; }
    }
    setSelectedGroupId(id);
    setTab("home");
  }

  function handleJoined(groupId: number) {
    setGroups((p) => p.map((g) => g.id === groupId ? { ...g, is_member: 1, my_role: "member", member_count: (g.member_count ?? 0) + 1 } : g));
    setSelectedGroupId(groupId);
    setTab("home");
    load();
  }

  const visiblePosts = tab === "trending" ? trending : homePosts;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30">
        <svg className="h-10 w-10 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (pageErr) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{pageErr}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex gap-6">

          {/* ── Left sidebar ────────────────────────────────────────────── */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-6 bg-card rounded-2xl border border-border/50 py-3 px-2">
              <GroupSidebar
                groups={groups}
                selectedGroupId={selectedGroupId}
                onSelect={handleSidebarSelect}
                onJoin={openJoinModal}
                onCreateClick={() => setShowCreateGroup(true)}
                onManageMembers={setMembersGroup}
              />
            </div>
          </aside>

          {/* ── Center feed ─────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 max-w-2xl">
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">

              {/* Tab bar */}
              <div className="flex border-b border-border/60">
                {(["home", "trending"] as FeedTab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-3.5 text-sm font-semibold transition-colors relative ${
                      tab === t
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {t === "home" ? "Home" : "Trending"}
                    {tab === t && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 rounded-full bg-indigo-600" />
                    )}
                  </button>
                ))}
                <button
                  onClick={load}
                  className="px-4 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors text-xs"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {/* Mobile group chip bar */}
              {tab === "home" && (
                <div className="flex gap-2 lg:hidden overflow-x-auto pb-2 pt-3 px-4 -mx-0">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedGroupId === null ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    All
                  </button>
                  {groups.filter((g) => g.is_member).map((g) => (
                    <button key={g.id} onClick={() => setSelectedGroupId(g.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedGroupId === g.id ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {g.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Composer (home only) */}
              {tab === "home" && (
                <Composer
                  groups={groups}
                  selectedGroupId={selectedGroupId}
                  currentUserId={currentUserId}
                  currentUserFirstname={currentUserFirstname}
                  onPost={handlePost}
                />
              )}

              {/* Posts */}
              {visiblePosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <span className="text-5xl mb-4">{tab === "trending" ? "📈" : "👥"}</span>
                  <p className="font-semibold text-foreground text-base">
                    {tab === "trending" ? "No trending posts yet" : "Nothing here yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {tab === "home" && groups.filter((g) => g.is_member).length === 0
                      ? "Join a group to see posts in your feed"
                      : tab === "home"
                        ? "Be the first to post in your groups!"
                        : "Trending posts from the last 7 days will appear here"}
                  </p>
                </div>
              ) : (
                <div>
                  {visiblePosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={currentUserId}
                      onLike={handleLike}
                      onUnlike={handleUnlike}
                      onPostUpdated={handlePostUpdated}
                      onDelete={handleDeletePost}
                    />
                  ))}
                </div>
              )}
            </div>
          </main>

          {/* ── Right panel ─────────────────────────────────────────────── */}
          <aside className="hidden xl:block w-72 shrink-0">
            <div className="sticky top-6">
              <RightPanel trending={trending} groups={groups} onJoin={openJoinModal} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowCreateGroup(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors z-30"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={handleGroupCreated} />}
      {joinTarget && <JoinModal group={joinTarget} onClose={() => setJoinTarget(null)} onJoined={() => handleJoined(joinTarget.id)} />}
      {membersGroup && (
        <MembersModal
          group={membersGroup}
          currentUserId={currentUserId}
          onClose={() => setMembersGroup(null)}
          onGroupUpdated={(updated) => {
            setGroups((p) => p.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
            setMembersGroup((p) => p ? { ...p, ...updated } : p);
          }}
        />
      )}
    </div>
  );
}
