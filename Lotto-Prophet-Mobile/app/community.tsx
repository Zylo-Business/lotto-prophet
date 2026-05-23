import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useAuth } from './context/AuthContext';
import { useTheme, type AppColors } from './context/ThemeContext';
import {
  fetchFeed,
  fetchGroups,
  fetchPostComments,
  fetchGroupDetails,
  addComment,
  updateComment,
  joinGroup,
  createGroup,
  createGroupPostWithImages,
  updateGroupPost,
  deleteGroupPost,
  likePost,
  unlikePost,
  promoteMember,
  demoteMember,
  updateGroup,
  removeMember,
  type CommunityGroup,
  type GroupPost,
  type PostComment,
  type CommunityMember,
  type ImageAsset,
} from './lib/community';
import { getBaseUrl } from './lib/auth';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

function initials(first?: string, last?: string) {
  return `${(first ?? '?')[0]}${(last ?? '')[0] ?? ''}`.toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];
function avatarBg(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

const MAX_CHARS = 500;

// ── sub-components ────────────────────────────────────────────────────────────

function Avatar({ userId, first, last, avatarUrl, baseUrl, size = 40 }: { userId: number; first?: string; last?: string; avatarUrl?: string | null; baseUrl?: string; size?: number }) {
  if (avatarUrl && baseUrl) {
    return (
      <Image
        source={{ uri: `${baseUrl}${avatarUrl}` }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarBg(userId),
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.38 }}>
        {initials(first, last)}
      </Text>
    </View>
  );
}

function PostCard({
  post,
  COLORS,
  styles,
  token,
  currentUserId,
  onLike,
  onPostUpdated,
  onDelete,
}: {
  post: GroupPost;
  COLORS: AppColors;
  styles: ReturnType<typeof createStyles>;
  token: string;
  currentUserId?: number;
  onLike: (post: GroupPost) => void;
  onPostUpdated: (updated: GroupPost) => void;
  onDelete: (post: GroupPost) => void;
}) {
  const liked = post.liked_by_me === 1;
  const isOwner = currentUserId !== undefined && post.user_id === currentUserId;
  const canModerate = ['owner', 'moderator'].includes(post.my_group_role ?? '');
  const canDelete = isOwner || canModerate;
  const imageUrls: string[] = post.image_urls ?? (post.image_url ? [post.image_url] : []);
  const BASE_URL = getBaseUrl();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentCount = Number(post.comment_count ?? 0);

  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  // Image lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Post edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const [editType, setEditType] = useState<'discussion' | 'forecast'>(post.post_type);
  const [editNums, setEditNums] = useState(post.predicted_numbers ?? '');
  const [editImages, setEditImages] = useState<ImageAsset[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEdit = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditType(post.post_type);
    setEditNums(post.predicted_numbers ?? '');
    setEditImages([]);
    setEditOpen(true);
  };

  const pickEditImage = async () => {
    if (editImages.length >= 5) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - editImages.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const newAssets: ImageAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
        filename: a.fileName ?? undefined,
      }));
      setEditImages((prev) => [...prev, ...newAssets].slice(0, 5));
    }
  };

  const submitEdit = async () => {
    if (!editTitle.trim() || !editBody.trim()) {
      Alert.alert('Title and body are required');
      return;
    }
    if (editBody.length > MAX_CHARS) {
      Alert.alert(`Max ${MAX_CHARS} characters`);
      return;
    }
    try {
      setEditSubmitting(true);
      const updated = await updateGroupPost(
        post.id,
        editTitle.trim(),
        editBody.trim(),
        token,
        editType,
        editNums.trim() || undefined,
        editImages.length > 0 ? editImages : undefined,
      );
      onPostUpdated(updated);
      setEditOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const saveCommentEdit = async (commentId: number) => {
    const body = editCommentBody.trim();
    if (!body) return;
    setSavingComment(true);
    try {
      const updated = await updateComment(post.id, commentId, body, token);
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, body: updated.body } : c));
      setEditingCommentId(null);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingComment(false);
    }
  };

  const toggleComments = async () => {
    if (!commentsOpen && comments.length === 0) {
      setCommentsLoading(true);
      try {
        const fetched = await fetchPostComments(post.id, token);
        setComments(fetched);
      } catch { /* silent */ }
      finally { setCommentsLoading(false); }
    }
    setCommentsOpen((v) => !v);
  };

  const submitComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await addComment(post.id, body, token);
      setCommentText('');
      const fetched = await fetchPostComments(post.id, token);
      setComments(fetched);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.postCard, { backgroundColor: COLORS.card }]}>
      <View style={styles.postHeader}>
        <Avatar userId={post.user_id} first={post.firstname} last={post.surname} avatarUrl={post.avatar_url} baseUrl={BASE_URL} />
        <View style={styles.postMeta}>
          <View style={styles.postMetaRow}>
            <Text style={[styles.postAuthor, { color: COLORS.text }]}>
              {post.firstname ?? 'Member'} {post.surname ?? ''}
            </Text>
            <Text style={[styles.postTime, { color: COLORS.textSecondary }]}>
              {timeAgo(post.created_at)}
            </Text>
          </View>
          {post.group_name && (
            <Text style={[styles.postGroup, { color: COLORS.textSecondary }]} numberOfLines={1}>
              {post.group_name}
            </Text>
          )}
        </View>
        {post.post_type === 'forecast' && (
          <View style={styles.forecastBadge}>
            <Text style={styles.forecastBadgeText}>Forecast</Text>
          </View>
        )}
        {isOwner && (
          <Pressable onPress={openEdit} style={{ padding: 4 }} hitSlop={8}>
            <Ionicons name="pencil-outline" size={16} color={COLORS.textSecondary} />
          </Pressable>
        )}
        {canDelete && (
          <Pressable onPress={() => onDelete(post)} style={{ padding: 4 }} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
          </Pressable>
        )}
      </View>

      <Text style={[styles.postTitle, { color: COLORS.text }]}>{post.title}</Text>
      <Text style={[styles.postBody, { color: COLORS.text }]}>{post.body}</Text>

      {/* Post images — tap to view full size */}
      {imageUrls.length > 0 && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {imageUrls.slice(0, 4).map((url, i) => (
              <Pressable
                key={i}
                onPress={() => setLightboxIndex(i)}
                style={{ position: 'relative', width: imageUrls.length === 1 ? '100%' : '48%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.border }}
              >
                <Image
                  source={{ uri: `${BASE_URL}${url}` }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {i === 3 && imageUrls.length > 4 && (
                  <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>+{imageUrls.length - 4}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          <Modal visible={lightboxIndex !== null} transparent animationType="fade" onRequestClose={() => setLightboxIndex(null)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
              {/* Close */}
              <Pressable
                style={{ position: 'absolute', top: 52, right: 16, zIndex: 10, padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 24 }}
                onPress={() => setLightboxIndex(null)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>

              {/* Counter */}
              {imageUrls.length > 1 && lightboxIndex !== null && (
                <View style={{ position: 'absolute', top: 56, alignSelf: 'center', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>{lightboxIndex + 1} / {imageUrls.length}</Text>
                </View>
              )}

              {/* Prev */}
              {lightboxIndex !== null && lightboxIndex > 0 && (
                <Pressable
                  style={{ position: 'absolute', left: 12, top: '50%', marginTop: -24, zIndex: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 28 }}
                  onPress={() => setLightboxIndex((i) => (i ?? 1) - 1)}
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </Pressable>
              )}

              {/* Image */}
              {lightboxIndex !== null && (
                <Image
                  source={{ uri: `${BASE_URL}${imageUrls[lightboxIndex]}` }}
                  style={{ width: '100%', height: '80%' }}
                  resizeMode="contain"
                />
              )}

              {/* Next */}
              {lightboxIndex !== null && lightboxIndex < imageUrls.length - 1 && (
                <Pressable
                  style={{ position: 'absolute', right: 12, top: '50%', marginTop: -24, zIndex: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 28 }}
                  onPress={() => setLightboxIndex((i) => (i ?? 0) + 1)}
                >
                  <Ionicons name="chevron-forward" size={24} color="#fff" />
                </Pressable>
              )}
            </View>
          </Modal>
        </>
      )}

      {post.predicted_numbers && (
        <View style={styles.numbersRow}>
          {post.predicted_numbers.split(',').map((n) => (
            <View key={n} style={styles.numberBubble}>
              <Text style={styles.numberBubbleText}>{n.trim()}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.actionBar, { borderTopColor: COLORS.border }]}>
        <Pressable style={styles.actionBtn} onPress={() => onLike(post)}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={17} color={liked ? '#ef4444' : COLORS.textSecondary} />
          <Text style={[styles.actionBtnText, { color: liked ? '#ef4444' : COLORS.textSecondary }]}>
            {Number(post.like_count ?? 0)}
          </Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={toggleComments}>
          <Ionicons name={commentsOpen ? 'chatbubble' : 'chatbubble-outline'} size={16} color={commentsOpen ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.actionBtnText, { color: commentsOpen ? COLORS.primary : COLORS.textSecondary }]}>
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        </Pressable>
      </View>

      {/* Comments section */}
      {commentsOpen && (
        <View style={[styles.commentsSection, { borderTopColor: COLORS.border }]}>
          {commentsLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 8 }} />}
          {comments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <Avatar userId={c.user_id} first={c.firstname} last={c.surname} avatarUrl={c.avatar_url} baseUrl={BASE_URL} size={28} />
              <View style={[styles.commentBubble, { backgroundColor: COLORS.inputBg ?? '#F3F4F6' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={[styles.commentAuthor, { color: COLORS.text, flex: 1 }]}>{c.firstname} {c.surname}</Text>
                  {currentUserId === c.user_id && editingCommentId !== c.id && (
                    <Pressable
                      onPress={() => { setEditingCommentId(c.id); setEditCommentBody(c.body); }}
                      hitSlop={8}
                      style={{ padding: 2 }}
                    >
                      <Ionicons name="pencil-outline" size={12} color={COLORS.textSecondary} />
                    </Pressable>
                  )}
                </View>
                {editingCommentId === c.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <TextInput
                      autoFocus
                      value={editCommentBody}
                      onChangeText={setEditCommentBody}
                      style={[styles.commentInput, { flex: 1, backgroundColor: COLORS.card, color: COLORS.text }]}
                      onSubmitEditing={() => saveCommentEdit(c.id)}
                      returnKeyType="done"
                    />
                    <Pressable onPress={() => saveCommentEdit(c.id)} disabled={savingComment || !editCommentBody.trim()}>
                      {savingComment ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                      )}
                    </Pressable>
                    <Pressable onPress={() => setEditingCommentId(null)}>
                      <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[styles.commentBody, { color: COLORS.text }]}>{c.body}</Text>
                )}
              </View>
            </View>
          ))}
          {comments.length === 0 && !commentsLoading && (
            <Text style={[styles.noComments, { color: COLORS.textSecondary }]}>No comments yet. Be the first!</Text>
          )}
          <View style={[styles.commentInputRow, { borderTopColor: COLORS.border }]}>
            <TextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment…"
              placeholderTextColor={COLORS.textSecondary}
              style={[styles.commentInput, { backgroundColor: COLORS.inputBg ?? '#F3F4F6', color: COLORS.text }]}
              onSubmitEditing={submitComment}
              returnKeyType="send"
            />
            <Pressable onPress={submitComment} disabled={submitting || !commentText.trim()} style={styles.commentSendBtn}>
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="send" size={18} color={commentText.trim() ? COLORS.primary : COLORS.textSecondary} />
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Edit modal */}
      <Modal visible={editOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: COLORS.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
            <Pressable onPress={() => setEditOpen(false)}>
              <Text style={[styles.modalCancel, { color: COLORS.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>Edit Post</Text>
            <Pressable
              onPress={submitEdit}
              disabled={editSubmitting}
              style={[styles.modalPost, { backgroundColor: COLORS.primary, opacity: editSubmitting ? 0.6 : 1 }]}
            >
              <Text style={styles.modalPostText}>{editSubmitting ? '…' : 'Save'}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['discussion', 'forecast'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setEditType(t)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: editType === t ? COLORS.primary : COLORS.card,
                      borderColor: editType === t ? COLORS.primary : COLORS.border,
                    },
                  ]}
                >
                  <Text style={{ color: editType === t ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '600' }}>
                    {t === 'discussion' ? '💬 Discussion' : '🔢 Forecast'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Title</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Post title…"
              placeholderTextColor={COLORS.textSecondary}
              style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />

            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              Body <Text style={{ color: editBody.length > MAX_CHARS ? '#ef4444' : COLORS.textSecondary }}>({MAX_CHARS - editBody.length})</Text>
            </Text>
            <TextInput
              value={editBody}
              onChangeText={setEditBody}
              placeholder="Share your thoughts…"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.textarea, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />

            {editType === 'forecast' && (
              <>
                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Predicted Numbers</Text>
                <TextInput
                  value={editNums}
                  onChangeText={setEditNums}
                  placeholder="3, 17, 22…"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
                />
              </>
            )}

            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              Photos (optional){editImages.length > 0 ? ` · ${editImages.length}/5` : ''}
            </Text>
            {editImages.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {editImages.map((img, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: img.uri }} style={styles.imagePreview} resizeMode="cover" />
                    <Pressable
                      onPress={() => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                      style={styles.removeImageBtn}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {editImages.length < 5 && (
              <Pressable
                onPress={pickEditImage}
                style={[styles.imagePicker, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}
              >
                <Ionicons name="image-outline" size={22} color={COLORS.textSecondary} />
                <Text style={[{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }]}>
                  {editImages.length === 0
                    ? imageUrls.length > 0 ? 'Tap to replace photos' : 'Tap to attach photos (up to 5)'
                    : `Add more (${5 - editImages.length} remaining)`}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── members modal ─────────────────────────────────────────────────────────────

function MembersModal({
  group,
  token,
  currentUserId,
  COLORS,
  styles,
  onClose,
  onGroupUpdated,
}: {
  group: CommunityGroup;
  token: string;
  currentUserId?: number;
  COLORS: AppColors;
  styles: ReturnType<typeof createStyles>;
  onClose: () => void;
  onGroupUpdated: (g: CommunityGroup) => void;
}) {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  // Edit group state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description);
  const [editPrivate, setEditPrivate] = useState(group.is_private === 1);
  const [editCode, setEditCode] = useState(group.join_code ?? '');
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    fetchGroupDetails(group.id, token)
      .then((d) => setMembers(d.members))
      .catch(() => Alert.alert('Error', 'Failed to load members'))
      .finally(() => setLoading(false));
  }, [group.id, token]);

  async function saveGroup() {
    if (!editName.trim() || editName.trim().length < 3) { Alert.alert('Error', 'Name must be at least 3 characters'); return; }
    if (editPrivate && editCode.trim().length < 4) { Alert.alert('Error', 'Join code must be at least 4 characters'); return; }
    setSavingGroup(true);
    try {
      const updated = await updateGroup(group.id, editName.trim(), editDesc.trim(), editPrivate, editPrivate ? editCode.trim() : undefined, token);
      onGroupUpdated(updated);
      setEditOpen(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingGroup(false);
    }
  }

  async function promote(memberId: number) {
    setBusy(memberId);
    try {
      await promoteMember(group.id, memberId, token);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: 'moderator' as const } : m));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setBusy(null); }
  }

  async function demote(memberId: number) {
    setBusy(memberId);
    try {
      await demoteMember(group.id, memberId, token);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: 'member' as const } : m));
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setBusy(null); }
  }

  async function remove(memberId: number) {
    Alert.alert('Remove member', 'Remove this person from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setBusy(memberId);
          try {
            await removeMember(group.id, memberId, token);
            setMembers((prev) => prev.filter((m) => m.id !== memberId));
          } catch (e: any) { Alert.alert('Error', e.message); }
          finally { setBusy(null); }
        },
      },
    ]);
  }

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: COLORS.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.modalCancel, { color: COLORS.textSecondary }]}>Done</Text>
          </Pressable>
          <Text style={[styles.modalTitle, { color: COLORS.text }]} numberOfLines={1}>{group.name}</Text>
          <Pressable onPress={() => { setEditOpen((v) => !v); setEditName(group.name); setEditDesc(group.description); setEditPrivate(group.is_private === 1); setEditCode(group.join_code ?? ''); }}>
            <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>{editOpen ? 'Cancel' : 'Edit'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          {/* Edit group form */}
          {editOpen && (
            <View style={{ gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary + '40', backgroundColor: COLORS.primary + '08', marginBottom: 4 }}>
              <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>Edit Group</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Group name"
                placeholderTextColor={COLORS.textSecondary}
                style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
              />
              <TextInput
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Description (optional)"
                placeholderTextColor={COLORS.textSecondary}
                multiline
                numberOfLines={2}
                style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
              />
              <Pressable
                style={[styles.toggleRow, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
                onPress={() => setEditPrivate((v) => !v)}
              >
                <Text style={[styles.toggleLabel, { color: COLORS.text }]}>Private group</Text>
                <View style={[styles.toggleKnob, { backgroundColor: editPrivate ? COLORS.primary : COLORS.border }]}>
                  <View style={[styles.toggleThumb, { alignSelf: editPrivate ? 'flex-end' : 'flex-start' }]} />
                </View>
              </Pressable>
              {editPrivate && (
                <TextInput
                  value={editCode}
                  onChangeText={setEditCode}
                  placeholder="Join code (min 4 chars)"
                  placeholderTextColor={COLORS.textSecondary}
                  style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
                />
              )}
              <Pressable
                onPress={saveGroup}
                disabled={savingGroup}
                style={[styles.modalPost, { backgroundColor: COLORS.primary, opacity: savingGroup ? 0.6 : 1, alignSelf: 'flex-end' }]}
              >
                <Text style={styles.modalPostText}>{savingGroup ? 'Saving…' : 'Save changes'}</Text>
              </Pressable>
            </View>
          )}

          {/* Members */}
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Members ({members.length})
          </Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 24 }} />
          ) : (
            members.map((m) => {
              const isMe = m.id === currentUserId;
              const isOwner = m.role === 'owner';
              const isMod = m.role === 'moderator';
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: avatarBg(m.id), justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {`${m.firstname[0] ?? ''}${m.surname[0] ?? ''}`.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.text, fontWeight: '600', fontSize: 14 }}>
                      {m.firstname} {m.surname}{isMe ? ' (you)' : ''}
                    </Text>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: 'capitalize' }}>
                      {m.role ?? 'member'}
                    </Text>
                  </View>
                  {isOwner && (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#f59e0b20' }}>
                      <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>Owner</Text>
                    </View>
                  )}
                  {!isMe && !isOwner && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {isMod ? (
                        <Pressable disabled={busy === m.id} onPress={() => demote(m.id)}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#f59e0b', opacity: busy === m.id ? 0.4 : 1 }}>
                          {busy === m.id ? <ActivityIndicator size="small" color="#f59e0b" /> : <Text style={{ color: '#f59e0b', fontSize: 12, fontWeight: '600' }}>Demote</Text>}
                        </Pressable>
                      ) : (
                        <Pressable disabled={busy === m.id} onPress={() => promote(m.id)}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, opacity: busy === m.id ? 0.4 : 1 }}>
                          {busy === m.id ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>Mod</Text>}
                        </Pressable>
                      )}
                      <Pressable disabled={busy === m.id} onPress={() => remove(m.id)}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444', opacity: busy === m.id ? 0.4 : 1 }}>
                        {busy === m.id ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>}
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

type Tab = 'feed' | 'groups';

export default function CommunityPage() {
  const { token, user } = useAuth();
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('feed');
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [feed, setFeed] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'discussion' | 'forecast'>('discussion');
  const [predictedNums, setPredictedNums] = useState('');
  const [postImages, setPostImages] = useState<ImageAsset[]>([]);
  const [posting, setPosting] = useState(false);
  const [membersModalGroup, setMembersModalGroup] = useState<CommunityGroup | null>(null);

  // Create group modal
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    try {
      const [g, f] = await Promise.all([
        fetchGroups(token),
        fetchFeed(token),
      ]);
      setGroups(g);
      setFeed(f);
    } catch {
      // errors shown inline
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { router.replace('/login'); return; }
    load();
  }, [token, load]);

  function handlePostUpdated(updated: GroupPost) {
    setFeed((prev) => prev.map((p) => p.id === updated.id ? { ...p, ...updated } : p));
  }

  async function handleLike(post: GroupPost) {
    if (!token) return;
    const liked = post.liked_by_me === 1;
    setFeed((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: liked ? 0 : 1, like_count: liked ? Math.max(0, (p.like_count ?? 1) - 1) : (p.like_count ?? 0) + 1 }
          : p
      )
    );
    try {
      liked ? await unlikePost(post.id, token) : await likePost(post.id, token);
    } catch {
      // revert
      setFeed((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: liked ? 1 : 0, like_count: liked ? (p.like_count ?? 0) + 1 : Math.max(0, (p.like_count ?? 1) - 1) }
            : p
        )
      );
    }
  }

  async function pickPostImage() {
    if (postImages.length >= 5) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5 - postImages.length,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length) {
      const newAssets: ImageAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
        filename: a.fileName ?? undefined,
      }));
      setPostImages((prev) => [...prev, ...newAssets].slice(0, 5));
    }
  }

  async function handlePost() {
    if (!token || !selectedGroupId) {
      Alert.alert('Select a group first');
      return;
    }
    if (!postTitle.trim() || !postBody.trim()) {
      Alert.alert('Title and body are required');
      return;
    }
    if (postBody.length > MAX_CHARS) {
      Alert.alert(`Max ${MAX_CHARS} characters`);
      return;
    }
    try {
      setPosting(true);
      await createGroupPostWithImages(
        selectedGroupId,
        postTitle.trim(),
        postBody.trim(),
        token,
        postType,
        predictedNums.trim() || undefined,
        postImages.length > 0 ? postImages : undefined,
      );
      setComposerOpen(false);
      setPostTitle('');
      setPostBody('');
      setPredictedNums('');
      setPostType('discussion');
      setPostImages([]);
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDeletePost(post: GroupPost) {
    if (!token) return;
    Alert.alert('Delete post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupPost(post.group_id, post.id, token);
            setFeed((prev) => prev.filter((p) => p.id !== post.id));
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  }

  async function handleJoin(group: CommunityGroup) {
    if (!token) return;
    if (group.is_private) {
      Alert.prompt(
        `Join ${group.name}`,
        'Enter the join code:',
        async (code) => {
          if (!code) return;
          try {
            await joinGroup(group.id, token, code);
            await load(true);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        }
      );
    } else {
      try {
        await joinGroup(group.id, token);
        await load(true);
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }
  }

  async function handleCreateGroup() {
    if (!token || !newName.trim()) {
      Alert.alert('Group name is required');
      return;
    }
    try {
      setCreating(true);
      await createGroup(newName.trim(), newDesc.trim(), newPrivate, token);
      setCreateGroupOpen(false);
      setNewName('');
      setNewDesc('');
      setNewPrivate(false);
      setNewCode('');
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCreating(false);
    }
  }

  const myGroups = groups.filter((g) => (g as any).is_member);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <Text style={[styles.headerTitle, { color: COLORS.text }]}>Community</Text>
        <Pressable
          style={[styles.newPostBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => setComposerOpen(true)}
        >
          <Ionicons name="create-outline" size={16} color="#fff" />
          <Text style={styles.newPostBtnText}>Post</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: COLORS.card, borderBottomColor: COLORS.border }]}>
        {(['feed', 'groups'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabItem, tab === t && { borderBottomColor: COLORS.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? COLORS.primary : COLORS.textSecondary }]}>
              {t === 'feed' ? 'Feed' : `Groups (${groups.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Feed tab */}
      {tab === 'feed' && (
        <FlatList
          data={feed}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.delay(40 * index).duration(300)}>
              <PostCard post={item} COLORS={COLORS} styles={styles} token={token!} currentUserId={user?.id} onLike={handleLike} onPostUpdated={handlePostUpdated} onDelete={handleDeletePost} />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No posts yet</Text>
              <Text style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>
                Join groups to see posts in your feed
              </Text>
            </View>
          }
        />
      )}

      {/* Groups tab */}
      {tab === 'groups' && (
        <FlatList
          data={groups}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          ListHeaderComponent={
            <Pressable
              style={[styles.createGroupBtn, { borderColor: COLORS.primary }]}
              onPress={() => setCreateGroupOpen(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.createGroupBtnText, { color: COLORS.primary }]}>Create a new group</Text>
            </Pressable>
          }
          renderItem={({ item, index }) => {
            const isMember = !!(item as any).is_member;
            return (
              <Animated.View entering={FadeInUp.delay(40 * index).duration(300)}>
                <View style={[styles.groupCard, { backgroundColor: COLORS.card }]}>
                  <View style={styles.groupCardLeft}>
                    <View style={[styles.groupIcon, { backgroundColor: isMember ? '#6366f110' : `${COLORS.border}` }]}>
                      <Ionicons
                        name={item.is_private ? 'lock-closed' : 'people'}
                        size={22}
                        color={isMember ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={[styles.groupName, { color: COLORS.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={[styles.groupMeta, { color: COLORS.textSecondary }]} numberOfLines={1}>
                        {item.description || 'No description'} · {item.is_private ? 'Private' : 'Public'}
                        {item.member_count !== undefined ? ` · ${item.member_count} members` : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.my_role === 'owner' && (
                      <Pressable
                        onPress={() => setMembersModalGroup(item)}
                        style={{ padding: 6 }}
                        hitSlop={8}
                      >
                        <Ionicons name="settings-outline" size={18} color={COLORS.textSecondary} />
                      </Pressable>
                    )}
                    {isMember ? (
                      <View style={[styles.memberBadge, { backgroundColor: '#10b98115' }]}>
                        <Text style={[styles.memberBadgeText, { color: '#10b981' }]}>Joined</Text>
                      </View>
                    ) : (
                      <Pressable
                        style={[styles.joinBtn, { backgroundColor: COLORS.primary }]}
                        onPress={() => handleJoin(item)}
                      >
                        <Text style={styles.joinBtnText}>Join</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏘️</Text>
              <Text style={[styles.emptyTitle, { color: COLORS.text }]}>No groups yet</Text>
              <Text style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>Create the first one!</Text>
            </View>
          }
        />
      )}

      {/* Composer Modal */}
      <Modal visible={composerOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: COLORS.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
            <Pressable onPress={() => setComposerOpen(false)}>
              <Text style={[styles.modalCancel, { color: COLORS.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>New Post</Text>
            <Pressable
              onPress={handlePost}
              disabled={posting}
              style={[styles.modalPost, { backgroundColor: COLORS.primary, opacity: posting ? 0.6 : 1 }]}
            >
              <Text style={styles.modalPostText}>{posting ? '…' : 'Post'}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            {/* Group picker */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {myGroups.length === 0 ? (
                  <Text style={[{ color: COLORS.textSecondary, fontSize: 13 }]}>Join a group first</Text>
                ) : (
                  myGroups.map((g) => (
                    <Pressable
                      key={g.id}
                      onPress={() => setSelectedGroupId(g.id)}
                      style={[
                        styles.groupChip,
                        {
                          backgroundColor: selectedGroupId === g.id ? COLORS.primary : COLORS.card,
                          borderColor: selectedGroupId === g.id ? COLORS.primary : COLORS.border,
                        },
                      ]}
                    >
                      <Text style={{ color: selectedGroupId === g.id ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '500' }}>
                        {g.name}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Type toggle */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['discussion', 'forecast'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setPostType(t)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: postType === t ? COLORS.primary : COLORS.card,
                      borderColor: postType === t ? COLORS.primary : COLORS.border,
                    },
                  ]}
                >
                  <Text style={{ color: postType === t ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '600' }}>
                    {t === 'discussion' ? '💬 Discussion' : '🔢 Forecast'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Title */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Title</Text>
            <TextInput
              value={postTitle}
              onChangeText={setPostTitle}
              placeholder="Post title…"
              placeholderTextColor={COLORS.textSecondary}
              style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />

            {/* Body */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              Body <Text style={{ color: postBody.length > MAX_CHARS ? '#ef4444' : COLORS.textSecondary }}>({MAX_CHARS - postBody.length})</Text>
            </Text>
            <TextInput
              value={postBody}
              onChangeText={setPostBody}
              placeholder="Share your thoughts… use #hashtags"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={5}
              style={[styles.input, styles.textarea, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />

            {postType === 'forecast' && (
              <>
                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Predicted Numbers</Text>
                <TextInput
                  value={predictedNums}
                  onChangeText={setPredictedNums}
                  placeholder="3, 17, 22…"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
                />
              </>
            )}

            {/* Image attachments (up to 5) */}
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>
              Photos (optional){postImages.length > 0 ? ` · ${postImages.length}/5` : ''}
            </Text>
            {postImages.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {postImages.map((img, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: img.uri }} style={styles.imagePreview} resizeMode="cover" />
                    <Pressable
                      onPress={() => setPostImages((prev) => prev.filter((_, idx) => idx !== i))}
                      style={styles.removeImageBtn}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            {postImages.length < 5 && (
              <Pressable
                onPress={pickPostImage}
                style={[styles.imagePicker, { borderColor: COLORS.border, backgroundColor: COLORS.card }]}
              >
                <Ionicons name="image-outline" size={22} color={COLORS.textSecondary} />
                <Text style={[{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }]}>
                  {postImages.length === 0 ? 'Tap to attach photos (up to 5)' : `Add more (${5 - postImages.length} remaining)`}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Members Modal */}
      {membersModalGroup && (
        <MembersModal
          group={membersModalGroup}
          token={token!}
          currentUserId={user?.id}
          COLORS={COLORS}
          styles={styles}
          onClose={() => setMembersModalGroup(null)}
          onGroupUpdated={(updated) => {
            setGroups((prev) => prev.map((g) => g.id === updated.id ? { ...g, ...updated } : g));
            setMembersModalGroup((prev) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}

      {/* Create Group Modal */}
      <Modal visible={createGroupOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: COLORS.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}>
            <Pressable onPress={() => setCreateGroupOpen(false)}>
              <Text style={[styles.modalCancel, { color: COLORS.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: COLORS.text }]}>New Group</Text>
            <Pressable
              onPress={handleCreateGroup}
              disabled={creating}
              style={[styles.modalPost, { backgroundColor: COLORS.primary, opacity: creating ? 0.6 : 1 }]}
            >
              <Text style={styles.modalPostText}>{creating ? '…' : 'Create'}</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Group name (min 3 chars)"
              placeholderTextColor={COLORS.textSecondary}
              style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />
            <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Description</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Optional description"
              placeholderTextColor={COLORS.textSecondary}
              style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
            />
            <Pressable
              style={[styles.toggleRow, { backgroundColor: COLORS.card, borderColor: COLORS.border }]}
              onPress={() => setNewPrivate((v) => !v)}
            >
              <View>
                <Text style={[styles.toggleLabel, { color: COLORS.text }]}>Private group</Text>
                <Text style={[styles.toggleSub, { color: COLORS.textSecondary }]}>Requires a join code</Text>
              </View>
              <View style={[styles.toggleKnob, { backgroundColor: newPrivate ? COLORS.primary : COLORS.border }]}>
                <View style={[styles.toggleThumb, { alignSelf: newPrivate ? 'flex-end' : 'flex-start' }]} />
              </View>
            </Pressable>
            {newPrivate && (
              <>
                <Text style={[styles.fieldLabel, { color: COLORS.textSecondary }]}>Join Code</Text>
                <TextInput
                  value={newCode}
                  onChangeText={setNewCode}
                  placeholder="Min 4 characters"
                  placeholderTextColor={COLORS.textSecondary}
                  style={[styles.input, { backgroundColor: COLORS.card, color: COLORS.text, borderColor: COLORS.border }]}
                />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (COLORS: AppColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 26, fontWeight: '700' },
    newPostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
    },
    newPostBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
    tabBar: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 14, fontWeight: '600' },
    listContent: { padding: 12, paddingBottom: 32 },
    postCard: {
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    postMeta: { flex: 1 },
    postMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    postAuthor: { fontSize: 14, fontWeight: '700' },
    postTime: { fontSize: 12 },
    postGroup: { fontSize: 12, marginTop: 1 },
    forecastBadge: {
      backgroundColor: '#f59e0b20',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    forecastBadgeText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
    postTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    postBody: { fontSize: 14, lineHeight: 21 },
    numbersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    numberBubble: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#6366f115',
      justifyContent: 'center',
      alignItems: 'center',
    },
    numberBubbleText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 10,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    actionBtnText: { fontSize: 13, fontWeight: '500' },
    groupCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
    groupCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    groupIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    groupInfo: { flex: 1 },
    groupName: { fontSize: 15, fontWeight: '700' },
    groupMeta: { fontSize: 12, marginTop: 2 },
    memberBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    memberBadgeText: { fontSize: 12, fontWeight: '600' },
    joinBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
    joinBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
    createGroupBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      justifyContent: 'center',
    },
    createGroupBtnText: { fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 48 },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '600' },
    emptySubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center' },
    modalContainer: { flex: 1 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { fontSize: 16, fontWeight: '700' },
    modalCancel: { fontSize: 15 },
    modalPost: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    modalPostText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    modalBody: { flex: 1 },
    fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      marginBottom: 4,
    },
    textarea: { minHeight: 100, textAlignVertical: 'top' },
    groupChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    typeChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    toggleLabel: { fontSize: 15, fontWeight: '600' },
    toggleSub: { fontSize: 12, marginTop: 1 },
    toggleKnob: {
      width: 44,
      height: 26,
      borderRadius: 13,
      padding: 2,
      justifyContent: 'center',
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#fff',
    },
    postImage: {
      width: '100%',
      height: 200,
      borderRadius: 12,
      marginTop: 10,
    },
    commentsSection: {
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 10,
      paddingTop: 10,
    },
    commentRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
    },
    commentBubble: {
      flex: 1,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    commentAuthor: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 2,
    },
    commentBody: {
      fontSize: 13,
      lineHeight: 18,
    },
    noComments: {
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 8,
    },
    commentInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 8,
      paddingTop: 8,
    },
    commentInput: {
      flex: 1,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 13,
    },
    commentSendBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePreview: {
      width: 100,
      height: 100,
      borderRadius: 10,
    },
    removeImageBtn: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePicker: {
      height: 90,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
