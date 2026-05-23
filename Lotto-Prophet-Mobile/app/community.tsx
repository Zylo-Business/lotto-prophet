import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  joinGroup,
  createGroup,
  createGroupPost,
  likePost,
  unlikePost,
  type CommunityGroup,
  type GroupPost,
} from './lib/community';

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

function Avatar({ userId, first, last, size = 40 }: { userId: number; first?: string; last?: string; size?: number }) {
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
  onLike,
}: {
  post: GroupPost;
  COLORS: AppColors;
  styles: ReturnType<typeof createStyles>;
  onLike: (post: GroupPost) => void;
}) {
  const liked = post.liked_by_me === 1;

  return (
    <View style={[styles.postCard, { backgroundColor: COLORS.card }]}>
      <View style={styles.postHeader}>
        <Avatar userId={post.user_id} first={post.firstname} last={post.surname} />
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
      </View>

      <Text style={[styles.postTitle, { color: COLORS.text }]}>{post.title}</Text>
      <Text style={[styles.postBody, { color: COLORS.text }]}>{post.body}</Text>

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
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={17}
            color={liked ? '#ef4444' : COLORS.textSecondary}
          />
          <Text style={[styles.actionBtnText, { color: liked ? '#ef4444' : COLORS.textSecondary }]}>
            {Number(post.like_count ?? 0)}
          </Text>
        </Pressable>
        <View style={styles.actionBtn}>
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.textSecondary} />
          <Text style={[styles.actionBtnText, { color: COLORS.textSecondary }]}>
            {Number(post.comment_count ?? 0)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

type Tab = 'feed' | 'groups';

export default function CommunityPage() {
  const { token } = useAuth();
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
  const [posting, setPosting] = useState(false);

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
      await createGroupPost(selectedGroupId, postTitle.trim(), postBody.trim(), token);
      setComposerOpen(false);
      setPostTitle('');
      setPostBody('');
      setPredictedNums('');
      setPostType('discussion');
      await load(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPosting(false);
    }
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
              <PostCard post={item} COLORS={COLORS} styles={styles} onLike={handleLike} />
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
          </ScrollView>
        </View>
      </Modal>

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
  });
