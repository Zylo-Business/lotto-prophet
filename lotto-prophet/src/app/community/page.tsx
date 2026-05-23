"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

// ── helpers ───────────────────────────────────────────────────────────────────

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

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];
function avatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function highlightHashtags(text: string) {
  const parts = text.split(/(#\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-indigo-600 dark:text-indigo-400 font-medium">{part}</span>
    ) : part
  );
}

const MAX_CHARS = 500;

// ── sub-components ────────────────────────────────────────────────────────────

function Avatar({ userId, first, last, avatarUrl, size = 40 }: { userId: number; first: string; last: string; avatarUrl?: string | null; size?: number }) {
  const bg = avatarColor(userId);
  if (avatarUrl) {
    return (
      <div className="rounded-full overflow-hidden shrink-0 select-none relative" style={{ width: size, height: size }}>
        <Image src={`${API_URL}${avatarUrl}`} alt={`${first} ${last}`} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {initials(first, last)}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onLike,
  onUnlike,
  onPostUpdated,
  onDelete,
}: {
  post: CommunityPost;
  currentUserId?: number;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
  onPostUpdated: (updated: CommunityPost) => void;
  onDelete: (post: CommunityPost) => void;
}) {
  const liked = post.liked_by_me === 1;
  const isOwner = currentUserId !== undefined && post.user_id === currentUserId;
  const canModerate = ['owner', 'moderator'].includes(post.my_group_role ?? '');
  const canDelete = isOwner || canModerate;
  const imageUrls: string[] = post.image_urls ?? (post.image_url ? [post.image_url] : []);
  const [bodyExpanded, setBodyExpanded] = useState(false);
  const BODY_LIMIT = 220;
  const bodyTruncated = !bodyExpanded && post.body.length > BODY_LIMIT;

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const commentCount = Number(post.comment_count ?? 0);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Image lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Post edit state
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

  function openEdit() {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditType(post.post_type);
    setEditNums(post.predicted_numbers ?? "");
    setEditImages([]);
    setEditPreviews([]);
    setEditErr(null);
    setEditOpen(true);
  }

  function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setEditImages((prev) => [...prev, ...selected].slice(0, 5));
    setEditPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))].slice(0, 5));
    e.target.value = "";
  }

  function removeEditImage(i: number) {
    setEditImages((prev) => prev.filter((_, idx) => idx !== i));
    setEditPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submitEdit() {
    if (!editTitle.trim()) { setEditErr("Title is required"); return; }
    if (!editBody.trim()) { setEditErr("Body is required"); return; }
    if (editBody.length > MAX_CHARS) { setEditErr(`Max ${MAX_CHARS} characters`); return; }
    try {
      setEditSubmitting(true);
      setEditErr(null);
      const updated = await updateGroupPost(post.id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        post_type: editType,
        predicted_numbers: editNums.trim() || undefined,
        images: editImages.length > 0 ? editImages : undefined,
      });
      onPostUpdated(updated);
      setEditOpen(false);
    } catch (e: any) {
      setEditErr(e.message);
    } finally {
      setEditSubmitting(false);
    }
  }

  function startEditComment(c: PostComment) {
    setEditingCommentId(c.id);
    setEditCommentBody(c.body);
  }

  async function saveCommentEdit(commentId: number) {
    const body = editCommentBody.trim();
    if (!body) return;
    setSavingComment(true);
    try {
      const updated = await updatePostComment(post.id, commentId, body);
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: updated.body } : c));
      setEditingCommentId(null);
    } catch { /* silent */ }
    finally { setSavingComment(false); }
  }

  async function toggleComments() {
    if (!commentsOpen && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const fetched = await fetchPostComments(post.id);
        setComments(fetched);
      } catch { /* silent */ }
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
      const fetched = await fetchPostComments(post.id);
      setComments(fetched);
    } catch { /* silent */ }
    finally { setSubmittingComment(false); }
  }

  return (
    <>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-3 px-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <Avatar userId={post.user_id} first={post.firstname} last={post.surname} avatarUrl={post.avatar_url} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">
                  {post.firstname} {post.surname}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</span>
                {post.group_name && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {post.group_name}
                  </Badge>
                )}
                {post.post_type === "forecast" && (
                  <Badge className="text-xs px-1.5 py-0 bg-amber-500 text-white hover:bg-amber-500">
                    Forecast
                  </Badge>
                )}
                {(post as any).is_pinned === 1 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    📌 Pinned
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-foreground mt-0.5 leading-snug">{post.title}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isOwner && (
                <button onClick={openEdit} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted" title="Edit post">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(post)} className="text-muted-foreground hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30" title="Delete post">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="text-sm text-foreground/90 leading-relaxed mb-3 pl-[52px]">
            <span>{highlightHashtags(bodyTruncated ? post.body.slice(0, BODY_LIMIT) + '…' : post.body)}</span>
            {post.body.length > BODY_LIMIT && (
              <button
                onClick={() => setBodyExpanded((v) => !v)}
                className="ml-1.5 text-indigo-600 dark:text-indigo-400 font-medium text-xs hover:underline"
              >
                {bodyExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Image grid — click any image to view full size */}
          {imageUrls.length > 0 && (
            <div className={`pl-[52px] mb-3 grid gap-1 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {imageUrls.slice(0, 4).map((url, i) => (
                <button
                  key={i}
                  className={`relative rounded-xl overflow-hidden bg-muted group block ${imageUrls.length === 1 ? 'h-56' : 'h-36'}`}
                  onClick={() => setLightboxIndex(i)}
                >
                  <Image src={`${API_URL}${url}`} alt={`Image ${i + 1}`} fill className="object-cover group-hover:brightness-90 transition-all" unoptimized />
                  {i === 3 && imageUrls.length > 4 && (
                    <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                      <span className="text-white font-bold text-2xl">+{imageUrls.length - 4}</span>
                    </div>
                  )}
                  {!(i === 3 && imageUrls.length > 4) && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/40 rounded-full p-1.5">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Predicted numbers */}
          {post.predicted_numbers && (
            <p className="pl-[52px] mb-3 text-xs text-muted-foreground">
              🔢 {post.predicted_numbers}
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-4 pl-[52px] pt-2 border-t border-muted/50">
            <button
              onClick={() => liked ? onUnlike(post.id) : onLike(post.id)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
              }`}
            >
              <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {Number(post.like_count ?? 0)}
            </button>
            <button
              onClick={toggleComments}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                commentsOpen ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground hover:text-indigo-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </button>
          </div>

          {/* Comments section */}
          {commentsOpen && (
            <div className="mt-3 pl-[52px] space-y-3">
              {commentsLoading && (
                <p className="text-xs text-muted-foreground">Loading comments…</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 items-start">
                  <Avatar userId={c.user_id} first={c.firstname} last={c.surname} avatarUrl={c.avatar_url} size={28} />
                  <div className="flex-1 min-w-0 bg-muted/60 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{c.firstname} {c.surname}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                      {currentUserId === c.user_id && editingCommentId !== c.id && (
                        <button
                          onClick={() => startEditComment(c)}
                          className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit comment"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <div className="flex gap-1.5 items-center mt-1">
                        <input
                          autoFocus
                          value={editCommentBody}
                          onChange={(e) => setEditCommentBody(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveCommentEdit(c.id); }
                            if (e.key === "Escape") setEditingCommentId(null);
                          }}
                          className="flex-1 text-xs border border-indigo-400 rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => saveCommentEdit(c.id)}
                          disabled={savingComment || !editCommentBody.trim()}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-40"
                        >
                          {savingComment ? "…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingCommentId(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
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
                <input
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                  placeholder="Add a comment…"
                  className="flex-1 text-xs border border-input rounded-full px-3 py-1.5 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={submitComment}
                  disabled={submittingComment || !commentInput.trim()}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-40 shrink-0"
                >
                  {submittingComment ? "…" : "Post"}
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setEditOpen(false)}>
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">Edit Post</h2>

            <div className="flex gap-2">
              {(["discussion", "forecast"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setEditType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    editType === t
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-muted text-muted-foreground hover:border-indigo-400"
                  }`}
                >
                  {t === "discussion" ? "💬 Discussion" : "🔢 Forecast"}
                </button>
              ))}
            </div>

            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Post title…"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="relative">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={5}
                placeholder="Post body…"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <span className={`absolute bottom-2.5 right-3 text-xs ${MAX_CHARS - editBody.length < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                {MAX_CHARS - editBody.length}
              </span>
            </div>

            {editType === "forecast" && (
              <input
                value={editNums}
                onChange={(e) => setEditNums(e.target.value)}
                placeholder="Predicted numbers (e.g. 3, 17, 22)"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            {/* Images (up to 5) */}
            <div className="space-y-2">
              {editPreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editPreviews.map((src, i) => (
                    <div key={i} className="relative">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <Image src={src} alt={`Image ${i + 1}`} fill className="object-cover" unoptimized />
                      </div>
                      <button
                        onClick={() => removeEditImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {editImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => editImageRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {editImages.length === 0
                    ? (imageUrls.length > 0 ? "Replace photos" : "Add photos (up to 5)")
                    : `Add more (${5 - editImages.length} remaining)`}
                </button>
              )}
              <input ref={editImageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleEditImageSelect} />
            </div>

            {editErr && <p className="text-xs text-destructive">{editErr}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={editSubmitting || MAX_CHARS - editBody.length < 0}
                onClick={submitEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {editSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox with prev/next */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/40 rounded-full p-2 transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Counter */}
          {imageUrls.length > 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-black/40 rounded-full px-3 py-1 z-10">
              {lightboxIndex + 1} / {imageUrls.length}
            </div>
          )}

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full p-3 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={`${API_URL}${imageUrls[lightboxIndex]}`}
              alt={`Image ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>

          {/* Next */}
          {lightboxIndex < imageUrls.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white bg-black/40 hover:bg-black/70 rounded-full p-3 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}

function GroupSidebar({
  groups,
  selectedGroupId,
  onSelect,
  onJoin,
  onCreateClick,
  onManageMembers,
}: {
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  onSelect: (id: number | null) => void;
  onJoin: (id: number) => void;
  onCreateClick: () => void;
  onManageMembers: (group: CommunityGroup) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Groups</h2>
        <button
          onClick={onCreateClick}
          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
        >
          + New
        </button>
      </div>

      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          selectedGroupId === null
            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
            : "text-foreground hover:bg-muted"
        }`}
      >
        🏠 Home Feed
      </button>

      {groups.map((g) => (
        <div key={g.id} className="flex items-center gap-1">
          <button
            onClick={() => g.is_member ? onSelect(g.id) : onJoin(g.id)}
            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              selectedGroupId === g.id
                ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <span className="flex-1 truncate">{g.is_private ? "🔒" : "👥"} {g.name}</span>
            {g.member_count !== undefined && (
              <span className="text-xs text-muted-foreground shrink-0">{g.member_count}</span>
            )}
            {!g.is_member && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0">Join</span>
            )}
          </button>
          {g.my_role === 'owner' && (
            <button
              onClick={() => onManageMembers(g)}
              className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Manage members"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground px-3 py-4 text-center">No groups yet</p>
      )}
    </div>
  );
}

function TrendingPanel({ posts }: { posts: CommunityPost[] }) {
  if (posts.length === 0) return null;
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trending this week</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {posts.map((p, i) => (
          <div key={p.id} className="flex gap-3 items-start">
            <span className="text-lg font-bold text-muted-foreground/40 w-5 shrink-0 leading-tight mt-0.5">{i + 1}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">{p.title}</p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                <span>❤️ {Number(p.like_count ?? 0)}</span>
                <span>💬 {Number(p.comment_count ?? 0)}</span>
                {p.group_name && <span>· {p.group_name}</span>}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Composer({
  groups,
  selectedGroupId,
  onPost,
}: {
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  onPost: (groupId: number, title: string, body: string, type: "discussion" | "forecast", nums: string, images?: File[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<"discussion" | "forecast">("discussion");
  const [numbers, setNumbers] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [composerErr, setComposerErr] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const myGroups = groups.filter((g) => g.is_member);
  const charsLeft = MAX_CHARS - body.length;

  useEffect(() => {
    if (!open) return;
    if (selectedGroupId && myGroups.find((g) => g.id === selectedGroupId)) {
      setGroupId(selectedGroupId);
    } else if (myGroups.length === 1) {
      setGroupId(myGroups[0].id);
    }
  }, [open, selectedGroupId]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setImageFiles((prev) => [...prev, ...selected].slice(0, 5));
    setImagePreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))].slice(0, 5));
    e.target.value = "";
  }

  function removeImage(i: number) {
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!groupId) { setComposerErr("Select a group"); return; }
    if (!title.trim()) { setComposerErr("Title is required"); return; }
    if (!body.trim()) { setComposerErr("Write something"); return; }
    if (body.length > MAX_CHARS) { setComposerErr(`Max ${MAX_CHARS} characters`); return; }
    try {
      setSubmitting(true);
      setComposerErr(null);
      await onPost(Number(groupId), title.trim(), body.trim(), postType, numbers.trim(), imageFiles.length > 0 ? imageFiles : undefined);
      setOpen(false);
      setTitle("");
      setBody("");
      setNumbers("");
      setPostType("discussion");
      setImageFiles([]);
      setImagePreviews([]);
    } catch (e: any) {
      setComposerErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-muted bg-card text-muted-foreground text-sm hover:border-indigo-400 hover:text-foreground transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
        What&apos;s on your mind?
      </button>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4 px-4 space-y-3">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select group…</option>
          {myGroups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {(["discussion", "forecast"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                postType === t
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-muted text-muted-foreground hover:border-indigo-400 hover:text-foreground"
              }`}
            >
              {t === "discussion" ? "💬 Discussion" : "🔢 Forecast"}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Post title…"
          className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="relative">
          <textarea
            ref={textRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Share your thoughts… use #hashtags to tag topics"
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <span
            className={`absolute bottom-2.5 right-3 text-xs ${
              charsLeft < 0 ? "text-red-500" : charsLeft < 50 ? "text-amber-500" : "text-muted-foreground"
            }`}
          >
            {charsLeft}
          </span>
        </div>

        {postType === "forecast" && (
          <input
            value={numbers}
            onChange={(e) => setNumbers(e.target.value)}
            placeholder="Predicted numbers (comma separated, e.g. 3, 17, 22)"
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}

        {/* Image attachments (up to 5) */}
        <div className="space-y-2">
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <Image src={src} alt={`Image ${i + 1}`} fill className="object-cover" unoptimized />
                  </div>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {imageFiles.length < 5 && (
            <button
              type="button"
              onClick={() => imageRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {imageFiles.length === 0 ? "Attach photos (up to 5)" : `Add more (${5 - imageFiles.length} remaining)`}
            </button>
          )}
          <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
        </div>

        {composerErr && <p className="text-xs text-destructive">{composerErr}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setOpen(false); setComposerErr(null); setImageFiles([]); setImagePreviews([]); }}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || charsLeft < 0}
            onClick={submit}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting ? "Posting…" : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MembersModal({
  group,
  currentUserId,
  onClose,
  onGroupUpdated,
}: {
  group: CommunityGroup;
  currentUserId?: number;
  onClose: () => void;
  onGroupUpdated: (g: CommunityGroup) => void;
}) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // Edit group state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description);
  const [editPrivate, setEditPrivate] = useState(group.is_private === 1);
  const [editCode, setEditCode] = useState(group.join_code ?? '');
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupErr, setGroupErr] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupDetails(group.id)
      .then((d) => setMembers(d.members))
      .catch(() => setActionErr("Failed to load members"))
      .finally(() => setLoading(false));
  }, [group.id]);

  async function saveGroup() {
    if (!editName.trim() || editName.trim().length < 3) { setGroupErr("Name must be at least 3 characters"); return; }
    if (editPrivate && editCode.trim().length < 4) { setGroupErr("Join code must be at least 4 characters"); return; }
    setSavingGroup(true);
    setGroupErr(null);
    try {
      const updated = await updateGroup(group.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        is_private: editPrivate,
        join_code: editPrivate ? editCode.trim() : undefined,
      });
      onGroupUpdated(updated);
      setEditOpen(false);
    } catch (e: any) {
      setGroupErr(e.message);
    } finally {
      setSavingGroup(false);
    }
  }

  async function promote(memberId: number) {
    setBusy(memberId); setActionErr(null);
    try {
      await promoteMember(group.id, memberId);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: 'moderator' } : m));
    } catch (e: any) { setActionErr(e.message); }
    finally { setBusy(null); }
  }

  async function demote(memberId: number) {
    setBusy(memberId); setActionErr(null);
    try {
      await demoteMember(group.id, memberId);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: 'member' } : m));
    } catch (e: any) { setActionErr(e.message); }
    finally { setBusy(null); }
  }

  async function remove(memberId: number) {
    if (!window.confirm("Remove this member from the group?")) return;
    setBusy(memberId); setActionErr(null);
    try {
      await removeMember(group.id, memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (e: any) { setActionErr(e.message); }
    finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-muted/50">
          <h2 className="text-lg font-bold text-foreground truncate flex-1">{group.name}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setEditOpen((v) => !v); setGroupErr(null); setEditName(group.name); setEditDesc(group.description); setEditPrivate(group.is_private === 1); setEditCode(group.join_code ?? ''); }}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${editOpen ? 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-muted text-muted-foreground hover:border-indigo-400 hover:text-indigo-600'}`}
            >
              Edit group
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Edit group form */}
          {editOpen && (
            <div className="space-y-2.5 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-900/10">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Edit Group</p>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Group name"
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={editPrivate} onChange={(e) => setEditPrivate(e.target.checked)} className="rounded" />
                Private group
              </label>
              {editPrivate && (
                <input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Join code (min 4 chars)"
                  className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              {groupErr && <p className="text-xs text-destructive">{groupErr}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditOpen(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2">Cancel</button>
                <Button size="sm" disabled={savingGroup} onClick={saveGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7">
                  {savingGroup ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          )}

          {/* Members list */}
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Members ({members.length})</p>
          {actionErr && <p className="text-xs text-destructive">{actionErr}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading members…</p>
          ) : (
            <div className="space-y-1">
              {members.map((m) => {
                const isMe = m.id === currentUserId;
                const isOwner = m.role === 'owner';
                const isMod = m.role === 'moderator';
                return (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                      style={{ backgroundColor: avatarColor(m.id) }}
                    >
                      {`${m.firstname[0] ?? ''}${m.surname[0] ?? ''}`.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {m.firstname} {m.surname}{isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{m.role ?? 'member'}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isMe && !isOwner && (
                        <>
                          {isMod ? (
                            <button disabled={busy === m.id} onClick={() => demote(m.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-amber-400 hover:text-amber-600 transition-colors disabled:opacity-40">
                              {busy === m.id ? "…" : "Demote"}
                            </button>
                          ) : (
                            <button disabled={busy === m.id} onClick={() => promote(m.id)}
                              className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-indigo-400 hover:text-indigo-600 transition-colors disabled:opacity-40">
                              {busy === m.id ? "…" : "Make Mod"}
                            </button>
                          )}
                          <button disabled={busy === m.id} onClick={() => remove(m.id)}
                            className="text-xs px-2 py-1 rounded-lg border border-muted text-muted-foreground hover:border-rose-400 hover:text-rose-500 transition-colors disabled:opacity-40">
                            {busy === m.id ? "…" : "Remove"}
                          </button>
                        </>
                      )}
                      {isOwner && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium">Owner</span>
                      )}
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

function CreateGroupModal({ onClose, onCreate }: { onClose: () => void; onCreate: (g: CommunityGroup) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      setModalErr(null);
      setSubmitting(true);
      const group = await createCommunityGroup({ name, description, is_private: isPrivate, join_code: joinCode });
      onCreate(group);
      onClose();
    } catch (e: any) {
      setModalErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-4">Create Group</h2>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="rounded" />
            Private group (join code required)
          </label>
          {isPrivate && (
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Join code (min 4 chars)"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          {modalErr && <p className="text-xs text-destructive">{modalErr}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function JoinModal({
  group,
  onClose,
  onJoined,
}: {
  group: CommunityGroup;
  onClose: () => void;
  onJoined: () => void;
}) {
  const [code, setCode] = useState("");
  const [joinErr, setJoinErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    try {
      setJoinErr(null);
      setSubmitting(true);
      await joinCommunityGroup(group.id, group.is_private ? code : undefined);
      onJoined();
      onClose();
    } catch (e: any) {
      setJoinErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-1">Join {group.name}</h2>
        {group.is_private ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">This group is private. Enter the join code to continue.</p>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Join code"
              className="w-full text-sm border border-input rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">This is a public group. Join to start posting!</p>
        )}
        {joinErr && <p className="text-xs text-destructive mb-2">{joinErr}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={submitting} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {submitting ? "Joining…" : "Join"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function CommunityPage() {
  const router = useRouter();

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [feed, setFeed] = useState<CommunityPost[]>([]);
  const [trending, setTrending] = useState<CommunityPost[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [joinTarget, setJoinTarget] = useState<CommunityGroup | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>(undefined);
  const [membersGroup, setMembersGroup] = useState<CommunityGroup | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPageErr(null);
      const [g, f, t] = await Promise.all([
        fetchCommunityGroups(),
        fetchFeed(),
        fetchTrending().catch(() => [] as CommunityPost[]),
      ]);
      setGroups(g);
      setFeed(f);
      setTrending(t);
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
      if (stored) setCurrentUserId(JSON.parse(stored)?.id);
    } catch { /* ignore */ }
    load();
  }, [router, load]);

  const visiblePosts = selectedGroupId
    ? feed.filter((p) => p.group_id === selectedGroupId)
    : feed;

  async function handleLike(postId: number) {
    await likePost(postId);
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: 1, like_count: (Number(p.like_count) + 1) as any }
          : p
      )
    );
  }

  async function handleUnlike(postId: number) {
    await unlikePost(postId);
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, liked_by_me: 0, like_count: (Math.max(0, Number(p.like_count) - 1)) as any }
          : p
      )
    );
  }

  function handlePostUpdated(updated: CommunityPost) {
    setFeed((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }

  async function handlePost(groupId: number, title: string, body: string, type: "discussion" | "forecast", numbers: string, images?: File[]) {
    await createGroupPost(groupId, { title, body, post_type: type, predicted_numbers: numbers || undefined, images });
    await load();
  }

  async function handleDeletePost(post: CommunityPost) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await deleteGroupPost(post.group_id, post.id);
      setFeed((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e: any) {
      alert(e.message || "Failed to delete post");
    }
  }

  function handleGroupCreated(group: CommunityGroup) {
    setGroups((prev) => [{ ...group, is_member: 1, my_role: "owner", member_count: 1 }, ...prev]);
  }

  function openJoinModal(id: number) {
    const group = groups.find((g) => g.id === id);
    if (group) setJoinTarget(group);
  }

  function handleSidebarSelect(id: number | null) {
    if (id !== null) {
      const group = groups.find((g) => g.id === id);
      if (group && !group.is_member) { openJoinModal(id); return; }
    }
    setSelectedGroupId(id);
  }

  function handleJoined(groupId: number) {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, is_member: 1, my_role: "member", member_count: (g.member_count ?? 0) + 1 }
          : g
      )
    );
    setSelectedGroupId(groupId);
    load();
  }

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

        {/* Mobile header */}
        <div className="flex items-center justify-between mb-5 lg:hidden">
          <h1 className="text-xl font-bold text-foreground">Community</h1>
          <Button size="sm" onClick={() => setShowCreateGroup(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            + Group
          </Button>
        </div>

        <div className="flex gap-5">

          {/* Left sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20">
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

          {/* Center feed */}
          <main className="flex-1 min-w-0 space-y-4">
            <Composer groups={groups} selectedGroupId={selectedGroupId} onPost={handlePost} />

            {/* Mobile group tabs */}
            <div className="flex gap-2 lg:hidden overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setSelectedGroupId(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedGroupId === null
                    ? "bg-indigo-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                Home
              </button>
              {groups.filter((g) => g.is_member).map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    selectedGroupId === g.id
                      ? "bg-indigo-600 text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {selectedGroupId
                  ? groups.find((g) => g.id === selectedGroupId)?.name ?? "Group"
                  : "Home Feed"}
              </p>
              <Button variant="ghost" size="sm" onClick={load} className="text-xs h-7">
                Refresh
              </Button>
            </div>

            {visiblePosts.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-16 text-center">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="font-semibold text-foreground">Nothing here yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {groups.filter((g) => g.is_member).length === 0
                      ? "Join a group to see posts in your feed"
                      : "Be the first to post!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visiblePosts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} onLike={handleLike} onUnlike={handleUnlike} onPostUpdated={handlePostUpdated} onDelete={handleDeletePost} />
                ))}
              </div>
            )}
          </main>

          {/* Right sidebar */}
          <aside className="hidden xl:block w-72 shrink-0 space-y-4">
            <TrendingPanel posts={trending} />

            {groups.filter((g) => !g.is_member).length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Discover Groups</p>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {groups.filter((g) => !g.is_member).slice(0, 5).map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {g.is_private ? "🔒" : "👥"} {g.name}
                        </p>
                        {g.member_count !== undefined && (
                          <p className="text-xs text-muted-foreground">{g.member_count} members</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 shrink-0"
                        onClick={() => openJoinModal(g.id)}
                      >
                        Join
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal onClose={() => setShowCreateGroup(false)} onCreate={handleGroupCreated} />
      )}
      {joinTarget && (
        <JoinModal
          group={joinTarget}
          onClose={() => setJoinTarget(null)}
          onJoined={() => handleJoined(joinTarget.id)}
        />
      )}
      {membersGroup && (
        <MembersModal
          group={membersGroup}
          currentUserId={currentUserId}
          onClose={() => setMembersGroup(null)}
          onGroupUpdated={(updated) => {
            setGroups((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
            setMembersGroup((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </div>
  );
}
