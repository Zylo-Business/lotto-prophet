import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function makeApi(token?: string) {
  return axios.create({
    baseURL: `${BASE_URL}/api/community`,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 15000,
  });
}

function extractError(err: unknown, fallback: string) {
  if (err instanceof AxiosError && err.response?.data?.error) {
    return String(err.response.data.error);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export type CommunityGroup = {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  is_private: 0 | 1;
  join_code: string | null;
  created_at: string;
  member_count?: number;
  is_member?: 0 | 1;
  my_role?: 'owner' | 'moderator' | 'member' | null;
};

export type CommunityPost = {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  body: string;
  post_type: 'discussion' | 'forecast';
  predicted_numbers: string | null;
  created_at: string;
  firstname: string;
  surname: string;
  comment_count: number;
  like_count?: number;
  liked_by_me?: 0 | 1;
  group_name?: string;
};

export type CommunityMember = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  joined_at: string;
  role?: 'owner' | 'moderator' | 'member';
};

export async function fetchCommunityGroups() {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.get('/groups');
    return data.groups as CommunityGroup[];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load community groups'));
  }
}

export async function createCommunityGroup(input: {
  name: string;
  description: string;
  is_private: boolean;
  join_code?: string;
}) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post('/groups', input);
    return data.group as CommunityGroup;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to create group'));
  }
}

export async function joinCommunityGroup(groupId: number, joinCode?: string) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/groups/${groupId}/join`, { join_code: joinCode });
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to join group'));
  }
}

export async function fetchGroupDetails(groupId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.get(`/groups/${groupId}`);
    return data as { group: CommunityGroup; members: CommunityMember[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load group'));
  }
}

export async function fetchGroupPosts(groupId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.get(`/groups/${groupId}/posts`);
    return data.posts as CommunityPost[];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to load posts'));
  }
}

export async function createGroupPost(groupId: number, input: { title: string; body: string; post_type: 'discussion' | 'forecast'; predicted_numbers?: string; }) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/groups/${groupId}/posts`, input);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to create post'));
  }
}

export async function createPostComment(postId: number, body: string) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/posts/${postId}/comments`, { body });
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to add comment'));
  }
}

export async function fetchFeed() {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.get('/feed');
    return data.posts as CommunityPost[];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch feed'));
  }
}

export async function fetchTrending() {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.get('/trending');
    return data.posts as CommunityPost[];
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch trending'));
  }
}

export async function likePost(postId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/posts/${postId}/like`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to like post'));
  }
}

export async function unlikePost(postId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.delete(`/posts/${postId}/like`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to unlike post'));
  }
}

export async function deleteGroupPost(groupId: number, postId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.delete(`/groups/${groupId}/posts/${postId}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete post'));
  }
}

export async function deletePostComment(postId: number, commentId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.delete(`/posts/${postId}/comments/${commentId}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete comment'));
  }
}

export async function promoteMember(groupId: number, memberId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/groups/${groupId}/members/${memberId}/promote`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to promote member'));
  }
}

export async function demoteMember(groupId: number, memberId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/groups/${groupId}/members/${memberId}/demote`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to demote member'));
  }
}

export async function banMember(groupId: number, memberId: number) {
  const token = localStorage.getItem('token');
  const api = makeApi(token || undefined);
  try {
    const { data } = await api.post(`/groups/${groupId}/members/${memberId}/ban`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to ban member'));
  }
}
