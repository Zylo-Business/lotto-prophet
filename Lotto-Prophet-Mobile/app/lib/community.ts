import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
function getDevHost(): string {
  const candidates: (string | undefined | null)[] = [
    (Constants.expoConfig as any)?.hostUri,
    (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost,
    (Constants.manifest as any)?.debuggerHost,
    (Constants.manifest2 as any)?.launchAsset?.url,
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    let host = raw.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    if (host && IPV4_RE.test(host)) return host;
  }

  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

const SERVER_PORT = 3001;
const BASE_URL = `http://${getDevHost()}:${SERVER_PORT}`;

const api = axios.create({
  baseURL: `${BASE_URL}/api/community`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

function extractError(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (error.code === 'ERR_NETWORK') return `Cannot reach the server at ${BASE_URL}.`;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export type CommunityGroup = {
  id: number;
  name: string;
  description: string;
  is_private: number;
  join_code?: string | null;
  member_count?: number;
  created_at: string;
  is_member?: number;
  my_role?: 'owner' | 'moderator' | 'member' | null;
};

export type GroupPost = {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  body: string;
  post_type: 'discussion' | 'forecast';
  predicted_numbers?: string;
  image_url?: string | null;
  image_urls?: string[];
  created_at: string;
  firstname?: string;
  surname?: string;
  avatar_url?: string | null;
  group_name?: string;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: 0 | 1;
  my_group_role?: 'owner' | 'moderator' | 'member' | null;
};

export type CommunityMember = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  joined_at: string;
  role?: 'owner' | 'moderator' | 'member';
};

export type PostComment = {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: string;
  firstname: string;
  surname: string;
  avatar_url?: string | null;
};

export async function fetchGroups(token?: string): Promise<CommunityGroup[]> {
  try {
    const { data } = await api.get('/groups', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return data.groups ?? data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load groups'));
  }
}

export async function fetchFeed(token: string): Promise<GroupPost[]> {
  try {
    const { data } = await api.get('/feed', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.posts ?? [];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load feed'));
  }
}

export async function createGroup(
  name: string,
  description: string,
  isPrivate: boolean,
  token: string,
): Promise<CommunityGroup> {
  try {
    const { data } = await api.post(
      '/groups',
      { name, description, is_private: isPrivate ? 1 : 0 },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to create group'));
  }
}

export async function joinGroup(groupId: number, token: string, joinCode?: string): Promise<{ message: string }> {
  try {
    const { data } = await api.post(
      `/groups/${groupId}/join`,
      joinCode ? { join_code: joinCode } : {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to join group'));
  }
}

export async function fetchGroupPosts(groupId: number, token: string): Promise<GroupPost[]> {
  try {
    const { data } = await api.get(`/groups/${groupId}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.posts ?? [];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load posts'));
  }
}

export async function createGroupPost(
  groupId: number,
  title: string,
  body: string,
  token: string,
): Promise<GroupPost> {
  try {
    const { data } = await api.post(
      `/groups/${groupId}/posts`,
      { title, body, post_type: 'discussion' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data.post;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to post to group'));
  }
}

export async function likePost(postId: number, token: string): Promise<void> {
  try {
    await api.post(`/posts/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to like post'));
  }
}

export async function unlikePost(postId: number, token: string): Promise<void> {
  try {
    await api.delete(`/posts/${postId}/like`, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to unlike post'));
  }
}

export async function fetchPostComments(postId: number, token: string): Promise<PostComment[]> {
  try {
    const { data } = await api.get(`/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.comments ?? [];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch comments'));
  }
}

export async function addComment(postId: number, body: string, token: string): Promise<void> {
  try {
    await api.post(`/posts/${postId}/comments`, { body }, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to add comment'));
  }
}

export type ImageAsset = { uri: string; mimeType?: string; filename?: string };

export async function createGroupPostWithImages(
  groupId: number,
  title: string,
  body: string,
  token: string,
  postType: 'discussion' | 'forecast' = 'discussion',
  predictedNumbers?: string,
  images?: ImageAsset[],
): Promise<GroupPost> {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    formData.append('post_type', postType);
    if (predictedNumbers) formData.append('predicted_numbers', predictedNumbers);
    images?.forEach((img, i) => {
      const filename = img.filename ?? img.uri.split('/').pop() ?? `photo${i}.jpg`;
      formData.append('images', { uri: img.uri, type: img.mimeType ?? 'image/jpeg', name: filename } as any);
    });
    const response = await fetch(`${BASE_URL}/api/community/groups/${groupId}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create post');
    return data.post;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to create post');
  }
}

export async function deleteGroupPost(groupId: number, postId: number, token: string): Promise<void> {
  try {
    await api.delete(`/groups/${groupId}/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete post'));
  }
}

export async function fetchGroupDetails(groupId: number, token: string): Promise<{ group: CommunityGroup; members: CommunityMember[]; my_role: string | null }> {
  try {
    const { data } = await api.get(`/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch group details'));
  }
}

export async function updateGroup(
  groupId: number,
  name: string,
  description: string,
  isPrivate: boolean,
  joinCode: string | undefined,
  token: string,
): Promise<CommunityGroup> {
  try {
    const { data } = await api.put(
      `/groups/${groupId}`,
      { name, description, is_private: isPrivate ? 1 : 0, join_code: joinCode },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data.group as CommunityGroup;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to update group'));
  }
}

export async function removeMember(groupId: number, memberId: number, token: string): Promise<void> {
  try {
    await api.delete(`/groups/${groupId}/members/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to remove member'));
  }
}

export async function promoteMember(groupId: number, memberId: number, token: string): Promise<void> {
  try {
    await api.post(`/groups/${groupId}/members/${memberId}/promote`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to promote member'));
  }
}

export async function demoteMember(groupId: number, memberId: number, token: string): Promise<void> {
  try {
    await api.post(`/groups/${groupId}/members/${memberId}/demote`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, 'Failed to demote member'));
  }
}

export async function updateComment(postId: number, commentId: number, body: string, token: string): Promise<PostComment> {
  try {
    const { data } = await api.put(`/posts/${postId}/comments/${commentId}`, { body }, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.comment as PostComment;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to update comment'));
  }
}

export async function updateGroupPost(
  postId: number,
  title: string,
  body: string,
  token: string,
  postType: 'discussion' | 'forecast' = 'discussion',
  predictedNumbers?: string,
  images?: ImageAsset[],
): Promise<GroupPost> {
  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);
    formData.append('post_type', postType);
    if (predictedNumbers) formData.append('predicted_numbers', predictedNumbers);
    images?.forEach((img, i) => {
      const filename = img.filename ?? img.uri.split('/').pop() ?? `photo${i}.jpg`;
      formData.append('images', { uri: img.uri, type: img.mimeType ?? 'image/jpeg', name: filename } as any);
    });
    const response = await fetch(`${BASE_URL}/api/community/posts/${postId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update post');
    return data.post;
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('Failed to update post');
  }
}

export default function _CommunityLibRoute() {
  return null;
}
