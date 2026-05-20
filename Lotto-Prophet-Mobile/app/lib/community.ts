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
  member_count?: number;
  created_at: string;
};

export type GroupPost = {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  body: string;
  post_type: 'discussion' | 'forecast';
  predicted_numbers?: string;
  created_at: string;
  firstname?: string;
  surname?: string;
  group_name?: string;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: 0 | 1;
};

export async function fetchGroups(): Promise<CommunityGroup[]> {
  try {
    const { data } = await api.get('/groups');
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

export async function joinGroup(groupId: number, token: string): Promise<{ message: string }> {
  try {
    const { data } = await api.post(
      `/groups/${groupId}/join`,
      {},
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

export default function _CommunityLibRoute() {
  return null;
}
