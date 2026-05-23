"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchCommunityGroups,
  fetchFeed,
  fetchTrending,
  createCommunityGroup,
  joinCommunityGroup,
  createGroupPost,
  likePost,
  unlikePost,
  type CommunityGroup,
  type CommunityPost,
} from "@/lib/community";

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

function Avatar({ userId, first, last, size = 40 }: { userId: number; first: string; last: string; size?: number }) {
  const bg = avatarColor(userId);
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
  onLike,
  onUnlike,
}: {
  post: CommunityPost;
  onLike: (id: number) => void;
  onUnlike: (id: number) => void;
}) {
  const liked = post.liked_by_me === 1;
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-3 px-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar userId={post.user_id} first={post.firstname} last={post.surname} />
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
        </div>

        {/* Body */}
        <p className="text-sm text-foreground/90 leading-relaxed mb-3 pl-[52px]">
          {highlightHashtags(post.body)}
        </p>

        {/* Predicted numbers */}
        {post.predicted_numbers && (
          <div className="pl-[52px] mb-3">
            <div className="inline-flex flex-wrap gap-1.5">
              {post.predicted_numbers.split(",").map((n) => (
                <span
                  key={n}
                  className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center"
                >
                  {n.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-4 pl-[52px] pt-2 border-t border-muted/50">
          <button
            onClick={() => liked ? onUnlike(post.id) : onLike(post.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
              liked
                ? "text-rose-500"
                : "text-muted-foreground hover:text-rose-500"
            }`}
          >
            <svg className="w-4 h-4" fill={liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {Number(post.like_count ?? 0)}
          </button>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {Number(post.comment_count ?? 0)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupSidebar({
  groups,
  selectedGroupId,
  onSelect,
  onJoin,
  onCreateClick,
}: {
  groups: CommunityGroup[];
  selectedGroupId: number | null;
  onSelect: (id: number | null) => void;
  onJoin: (id: number) => void;
  onCreateClick: () => void;
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
        <button
          key={g.id}
          onClick={() => g.is_member ? onSelect(g.id) : onJoin(g.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
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
  onPost: (groupId: number, title: string, body: string, type: "discussion" | "forecast", nums: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [postType, setPostType] = useState<"discussion" | "forecast">("discussion");
  const [numbers, setNumbers] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [composerErr, setComposerErr] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

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

  async function submit() {
    if (!groupId) { setComposerErr("Select a group"); return; }
    if (!title.trim()) { setComposerErr("Title is required"); return; }
    if (!body.trim()) { setComposerErr("Write something"); return; }
    if (body.length > MAX_CHARS) { setComposerErr(`Max ${MAX_CHARS} characters`); return; }
    try {
      setSubmitting(true);
      setComposerErr(null);
      await onPost(Number(groupId), title.trim(), body.trim(), postType, numbers.trim());
      setOpen(false);
      setTitle("");
      setBody("");
      setNumbers("");
      setPostType("discussion");
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

        {composerErr && <p className="text-xs text-destructive">{composerErr}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { setOpen(false); setComposerErr(null); }}>
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

  async function handlePost(groupId: number, title: string, body: string, type: "discussion" | "forecast", numbers: string) {
    await createGroupPost(groupId, { title, body, post_type: type, predicted_numbers: numbers || undefined });
    await load();
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
                  <PostCard key={post.id} post={post} onLike={handleLike} onUnlike={handleUnlike} />
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
    </div>
  );
}
