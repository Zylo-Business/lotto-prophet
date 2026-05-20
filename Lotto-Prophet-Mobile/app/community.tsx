import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import {
  CommunityGroup,
  fetchFeed,
  fetchGroupPosts,
  fetchGroups,
  joinGroup,
  createGroup,
  createGroupPost,
  likePost,
  unlikePost,
  GroupPost,
} from './lib/community';

export default function CommunityPage() {
  const router = useRouter();
  const { token, logout } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CommunityGroup | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [feed, setFeed] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');

  async function loadGroups() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchGroups();
      setGroups(data);
      if (!selectedGroup && data.length > 0) setSelectedGroup(data[0]);
    } catch (err: any) {
      setError(err?.message || 'Could not load groups.');
    } finally {
      setLoading(false);
    }
  }

  async function loadGroupPosts(group: CommunityGroup | null) {
    if (!token || !group) return;
    setLoading(true);
    try {
      const fetched = await fetchGroupPosts(group.id, token);
      setPosts(fetched);
    } catch (err: any) {
      setError(err?.message || 'Could not load group posts.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFeed() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchFeed(token);
      setFeed(data);
    } catch (err: any) {
      setError(err?.message || 'Could not load feed.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
    loadFeed();
  }, [token]);

  useEffect(() => {
    loadGroupPosts(selectedGroup);
  }, [selectedGroup, token]);

  const onJoin = async () => {
    if (!token || !selectedGroup) return;
    setLoading(true);
    try {
      await joinGroup(selectedGroup.id, token);
      Alert.alert('Joined', `You joined ${selectedGroup.name}.`);
      await loadGroupPosts(selectedGroup);
      await loadFeed();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to join group');
    } finally {
      setLoading(false);
    }
  };

  const onCreateGroup = async () => {
    if (!token) return;
    if (!newGroupName.trim()) {
      Alert.alert('Group name required');
      return;
    }

    setLoading(true);
    try {
      const created = await createGroup(newGroupName.trim(), newGroupDesc.trim(), newGroupPrivate, token);
      setGroups((prev) => [created, ...prev]);
      setSelectedGroup(created);
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPrivate(false);
      await loadFeed();
      Alert.alert('Created', `Group ${created.name} created successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Cannot create group');
    } finally {
      setLoading(false);
    }
  };

  const onCreatePost = async () => {
    if (!token || !selectedGroup) return;
    if (!newPostTitle.trim() || !newPostBody.trim()) {
      Alert.alert('Please add title and body for your post.');
      return;
    }

    setLoading(true);
    try {
      const post = await createGroupPost(selectedGroup.id, newPostTitle.trim(), newPostBody.trim(), token);
      setPosts((prev) => [post, ...prev]);
      setNewPostTitle('');
      setNewPostBody('');
      await loadFeed();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not create post');
    } finally {
      setLoading(false);
    }
  };

  const onLike = async (post: GroupPost) => {
    if (!token) return;
    try {
      if (post.liked_by_me) {
        await unlikePost(post.id, token);
      } else {
        await likePost(post.id, token);
      }
      await loadFeed();
      await loadGroupPosts(selectedGroup);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not like post');
    }
  };

  if (!token) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.heading, { marginBottom: 16 }]}>Please sign in first.</Text>
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
          <Text style={[styles.buttonText, { color: '#fff' }]}>Login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <Pressable onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={[styles.logoutText, { color: colors.text }]}> Sign out</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Create Group</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            placeholder="Group name"
            placeholderTextColor={colors.textSecondary}
            value={newGroupName}
            onChangeText={setNewGroupName}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            placeholder="Description"
            placeholderTextColor={colors.textSecondary}
            value={newGroupDesc}
            onChangeText={setNewGroupDesc}
          />
          <Pressable
            onPress={() => setNewGroupPrivate((prev) => !prev)}
            style={[styles.toggleButton, newGroupPrivate ? styles.toggleActive : styles.toggleInactive]}
          >
            <Text style={styles.toggleLabel}>{newGroupPrivate ? 'Private' : 'Public'}</Text>
          </Pressable>
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onCreateGroup}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Create Group</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={styles.groupHeader}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>{groups.length} available</Text>
          </View>
          {groups.map((group) => (
            <Pressable
              key={group.id}
              style={[
                styles.groupItem,
                { backgroundColor: selectedGroup?.id === group.id ? `${colors.primary}15` : colors.background, borderColor: colors.border },
              ]}
              onPress={() => setSelectedGroup(group)}
            >
              <View>
                <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>{group.description || 'No description'} · {group.is_private ? 'Private' : 'Public'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
          {selectedGroup ? (
            <Pressable style={[styles.button, { backgroundColor: '#10B981' }]} onPress={onJoin}>
              <Text style={[styles.buttonText, { color: '#fff' }]}>Join {selectedGroup.name}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Post in {selectedGroup?.name ?? 'a group'}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
            placeholder="Post title"
            placeholderTextColor={colors.textSecondary}
            value={newPostTitle}
            onChangeText={setNewPostTitle}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text, minHeight: 70 }]}
            placeholder="What do you want to share?"
            placeholderTextColor={colors.textSecondary}
            value={newPostBody}
            onChangeText={setNewPostBody}
            multiline
          />
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onCreatePost}>
            <Text style={[styles.buttonText, { color: '#fff' }]}>Post to Group</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} /> : null}
        {error ? <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text> : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={styles.sectionTitle}>Social Feed</Text>
          {feed.length === 0 ? (
            <Text style={[styles.muted, { color: colors.textSecondary }]}>No posts yet. Join groups to see updates.</Text>
          ) : (
            feed.map((post) => (
              <View key={`feed-${post.id}`} style={[styles.postCard, { backgroundColor: colors.background, borderColor: colors.border }]}> 
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.postAuthor, { color: colors.text }]}>{post.firstname ?? 'Member'} {post.surname ?? ''}</Text>
                    <Text style={[styles.muted, { color: colors.textSecondary, fontSize: 11 }]}>{post.group_name || 'Community Group'}</Text>
                  </View>
                  <Text style={[styles.muted, { color: colors.textSecondary, fontSize: 11 }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
                <Text style={[styles.postContent, { color: colors.text }]}>{post.body}</Text>
                <View style={styles.actionsRow}>
                  <Pressable style={styles.actionButton} onPress={() => onLike(post)}>
                    <Ionicons name={post.liked_by_me ? 'heart' : 'heart-outline'} size={16} color={post.liked_by_me ? '#ef4444' : colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.like_count ?? 0} Likes</Text>
                  </Pressable>
                  <View style={styles.actionButton}>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comment_count ?? 0} Comments</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 14, marginBottom: 8 },
    title: { fontSize: 28, fontWeight: '700', color: colors.text },
    logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    logoutText: { fontSize: 13, fontWeight: '600' },
    scrollArea: { paddingHorizontal: 12, paddingBottom: 24 },
    card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: colors.text },
    input: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
    toggleButton: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, marginBottom: 8, alignSelf: 'flex-start' },
    toggleActive: { backgroundColor: colors.primary },
    toggleInactive: { backgroundColor: colors.border },
    toggleLabel: { color: '#fff', fontWeight: '600' },
    button: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
    buttonText: { fontWeight: '700' },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    groupItem: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupName: { fontSize: 15, fontWeight: '700' },
    muted: { fontSize: 12, color: colors.textSecondary },
    errorText: { fontSize: 12, marginBottom: 6 },
    postCard: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 8 },
    postAuthor: { fontSize: 13, fontWeight: '700' },
    postTitle: { fontSize: 15, fontWeight: '700', marginTop: 3 },
    postContent: { fontSize: 14, marginTop: 6 },
    actionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 16 },
    actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionText: { fontSize: 12 },
    heading: { fontSize: 20, fontWeight: '700', color: colors.text },
  });
}
