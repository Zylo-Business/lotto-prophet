"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCommunityGroup,
  fetchCommunityGroups,
  fetchGroupDetails,
  fetchGroupPosts,
  joinCommunityGroup,
  createGroupPost,
  createPostComment,
  fetchFeed,
  likePost,
  unlikePost,
  type CommunityGroup,
  type CommunityPost,
  type CommunityMember,
} from "@/lib/community";

export default function CommunityPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [joinGroupCode, setJoinGroupCode] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [newPostType, setNewPostType] = useState<"discussion" | "forecast">("discussion");
  const [newPrediction, setNewPrediction] = useState("");
  const [commentDraft, setCommentDraft] = useState<Record<number, string>>({});
  const [feed, setFeed] = useState<CommunityPost[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadGroups();
    loadFeed();
  }, [router]);

  async function loadGroups() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCommunityGroups();
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        await selectGroup(data[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Could not load groups");
    } finally {
      setLoading(false);
    }
  }

  async function loadFeed() {
    try {
      const posts = await fetchFeed();
      setFeed(posts);
    } catch (err: any) {
      setError(err?.message || "Could not load feed");
    }
  }

  async function selectGroup(group: CommunityGroup) {
    setSelectedGroup(group);
    try {
      const details = await fetchGroupDetails(group.id);
      setMembers(details.members);
      const postsData = await fetchGroupPosts(group.id);
      setPosts(postsData);
    } catch (err: any) {
      setError(err?.message || "Could not load group details");
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      setError("Enter a group name.");
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      const group = await createCommunityGroup({
        name: groupName,
        description: groupDescription,
        is_private: isPrivate,
        join_code: isPrivate ? joinCode : undefined,
      });
      setGroupName("");
      setGroupDescription("");
      setJoinCode("");
      setIsPrivate(false);
      const updated = await fetchCommunityGroups();
      setGroups(updated);
      selectGroup(group);
    } catch (err: any) {
      setError(err?.message || "Could not create group.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoin(group: CommunityGroup) {
    try {
      await joinCommunityGroup(group.id, joinGroupCode || undefined);
      await selectGroup(group);
      await loadGroups();
      setJoinGroupCode("");
    } catch (err: any) {
      setError(err?.message || "Could not join group");
    }
  }

  async function handleNewPost() {
    if (!selectedGroup) return;
    if (!newPostTitle.trim() || !newPostBody.trim()) {
      setError("Post title and body are required.");
      return;
    }
    setError(null);
    try {
      await createGroupPost(selectedGroup.id, {
        title: newPostTitle,
        body: newPostBody,
        post_type: newPostType,
        predicted_numbers: newPostType === "forecast" ? newPrediction : undefined,
      });
      setNewPostTitle("");
      setNewPostBody("");
      setNewPrediction("");
      const postsData = await fetchGroupPosts(selectedGroup.id);
      setPosts(postsData);
      await loadFeed();
    } catch (err: any) {
      setError(err?.message || "Could not create post");
    }
  }

  async function handleAddComment(postId: number) {
    const body = commentDraft[postId]?.trim();
    if (!body) return;
    setError(null);
    try {
      await createPostComment(postId, body);
      if (selectedGroup) {
        const postsData = await fetchGroupPosts(selectedGroup.id);
        setPosts(postsData);
      }
      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
    } catch (err: any) {
      setError(err?.message || "Could not add comment");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-3 text-muted-foreground">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30 px-4 py-8">
      <div className="container mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Community Forum</h1>
            <p className="text-muted-foreground mt-1">Create private groups, share forecasts, and discuss strategies with members.</p>
          </div>
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm w-full sm:w-auto">
            <div className="mb-2 text-sm font-semibold">Create a private/public group</div>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="w-full rounded-md border px-3 py-2 text-sm" />
            <textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} rows={2} placeholder="Short description" className="mt-2 w-full rounded-md border px-3 py-2 text-sm" />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private group
              </label>
              {isPrivate && <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Join code" className="rounded-md border px-2 py-1 text-sm" />}
            </div>
            <button disabled={createLoading} onClick={handleCreateGroup} className="mt-2 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60">{createLoading ? 'Creating...' : 'Create group'}</button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          <section className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Groups</h2>
              <span className="text-xs text-muted-foreground">{groups.length} groups</span>
            </div>
            <input
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              placeholder="Search groups by name..."
              className="mb-2 w-full rounded-md border px-2 py-1 text-sm"
            />
            <div className="space-y-2">
              {groups.filter((group) => group.name.toLowerCase().includes(groupSearch.toLowerCase())).map((group) => (
                <button key={group.id} onClick={() => selectGroup(group)} className={`w-full text-left rounded-xl border p-2 transition ${selectedGroup?.id === group.id ? 'border-indigo-500 bg-indigo-50' : 'border-border bg-background hover:border-indigo-300 hover:bg-indigo-50/30'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{group.description || 'No description yet.'}</div>
                    </div>
                    <div className="text-[11px] rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{group.is_private ? 'Private' : 'Public'}</div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Members: {group.member_count ?? 0}</div>
                </button>
              ))}
            </div>
            {selectedGroup && !selectedGroup.is_member && (
              <div className="mt-3 border-t border-border pt-3">
                <p className="text-sm font-medium">Join "{selectedGroup.name}"</p>
                {selectedGroup.is_private && (
                  <input value={joinGroupCode} onChange={(e) => setJoinGroupCode(e.target.value)} placeholder="Enter join code" className="mt-2 w-full rounded-md border px-2 py-1 text-sm" />
                )}
                <button onClick={() => handleJoin(selectedGroup)} className="mt-2 w-full rounded-md bg-green-600 px-2 py-1.5 text-sm text-white">Join group</button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            {!selectedGroup ? (
              <div className="text-center text-muted-foreground">Choose a group to view and post.</div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xl font-semibold">{selectedGroup.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedGroup.description || 'No group description yet.'}</div>
                    {selectedGroup.my_role && (
                      <div className="mt-1 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700">Role: {selectedGroup.my_role}</div>
                    )}
                  </div>
                  <div className="text-xs rounded-full border px-2 py-1 text-muted-foreground">{selectedGroup.is_private ? 'Private' : 'Public'}</div>
                </div>
                <div className="mb-4 rounded-xl border border-border p-3 bg-slate-50 dark:bg-slate-900">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground font-semibold">Group members ({members.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <span key={m.id} className="rounded-full border border-border px-2 py-0.5 text-xs">
                        {m.firstname} {m.surname} {m.role ? `(${m.role})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-border p-3 bg-slate-50">
                  <div className="text-sm font-semibold">Post an update</div>
                  <input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} placeholder="Post title" className="mt-2 w-full rounded-md border px-2 py-1 text-sm" />
                  <textarea value={newPostBody} onChange={(e) => setNewPostBody(e.target.value)} rows={3} placeholder="Write your discussion or forecast details..." className="mt-2 w-full rounded-md border px-2 py-1 text-sm" />
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <select value={newPostType} onChange={(e) => setNewPostType(e.target.value as 'discussion' | 'forecast')} className="rounded-md border px-2 py-1 text-sm">
                      <option value="discussion">Discussion</option>
                      <option value="forecast">Forecast</option>
                    </select>
                    {newPostType === 'forecast' && (
                      <input value={newPrediction} onChange={(e) => setNewPrediction(e.target.value)} placeholder="Predicted digits (e.g. 04,11,28,33,37)" className="rounded-md border px-2 py-1 text-sm flex-1 min-w-[180px]" />
                    )}
                    <button onClick={handleNewPost} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white">Post</button>
                  </div>
                </div>

                <div className="space-y-3">
                  {posts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-muted-foreground">No posts yet. Start a discussion or forecast!</div>
                  ) : posts.map((post) => (
                    <article key={post.id} className="rounded-xl border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">{post.title}</p>
                          <p className="text-xs text-muted-foreground">By {post.firstname} {post.surname} • {new Date(post.created_at).toLocaleString()}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${post.post_type === 'forecast' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                          {post.post_type === 'forecast' ? 'Forecast' : 'Discussion'}
                        </span>
                      </div>
                      {post.predicted_numbers && (
                        <div className="mt-2 rounded-md bg-indigo-50 p-2 text-sm text-indigo-700">Predicted digits: {post.predicted_numbers}</div>
                      )}
                      <p className="mt-2 whitespace-pre-line text-sm">{post.body}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{post.comment_count ?? 0} comments</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 flex flex-col gap-2">
                        <textarea
                          value={commentDraft[post.id] || ''}
                          onChange={(e) => setCommentDraft((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Add a comment"
                          className="rounded-md border px-2 py-1 text-sm"
                          rows={2}
                        />
                        <button onClick={() => handleAddComment(post.id)} className="self-end rounded-md bg-slate-600 px-2 py-1 text-xs text-white">Comment</button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Social Feed</h3>
            <button onClick={loadFeed} className="rounded-md border px-2 py-1 text-xs">Refresh</button>
          </div>
          {feed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-3 text-center text-muted-foreground">No social feed yet. Post in your groups to populate it.</div>
          ) : (
            <div className="space-y-2">
              {feed.map((item) => (
                <div key={`feed-${item.id}`} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.firstname} {item.surname} · {item.group_name || 'Group'} · {new Date(item.created_at).toLocaleDateString()}</div>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] text-indigo-700">{item.post_type === 'forecast' ? 'Forecast' : 'Discussion'}</span>
                  </div>
                  <div className="mt-2 text-sm whitespace-pre-line">{item.body}</div>
                  {item.predicted_numbers && <div className="mt-2 rounded-md bg-emerald-50 p-2 text-xs font-medium">Predicted: {item.predicted_numbers}</div>}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <button
                      onClick={async () => {
                        try {
                          if (item.liked_by_me) {
                            await unlikePost(item.id);
                          } else {
                            await likePost(item.id);
                          }
                          await loadFeed();
                        } catch (err: any) {
                          setError(err?.message || 'Could not update like.');
                        }
                      }}
                      className="rounded-md border px-2 py-1"
                    >
                      {item.liked_by_me ? '💖' : '🤍'} {item.like_count ?? 0}
                    </button>
                    <span>{item.comment_count ?? 0} comments</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
