import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function makeApi(token: string) {
  return axios.create({
    baseURL: `${BASE_URL}/api/admin`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    timeout: 20000,
  });
}

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data?.error) return String(err.response.data.error);
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AdminStats = {
  users: number;
  draws: number;
  courses: number;
  lessons: number;
  groups: number;
  posts: number;
  push_tokens: number;
  draws_by_source: { source: string; count: number }[];
};

export type AdminDraw = {
  id: number;
  event_number: number;
  date: string;
  source: string;
  N1: number; N2: number; N3: number; N4: number; N5: number;
  M1: number | null; M2: number | null; M3: number | null; M4: number | null; M5: number | null;
};

export type AdminUser = {
  id: number;
  firstname: string;
  surname: string;
  email: string;
  country_code: string;
  mobile_number: string;
  created_at: string;
};

export type AdminGroup = {
  id: number;
  name: string;
  description: string;
  owner_id: number;
  firstname: string;
  surname: string;
  is_private: number;
  member_count: number;
  post_count: number;
  created_at: string;
};

export type AdminPost = {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  body: string;
  post_type: string;
  firstname: string;
  surname: string;
  group_name: string;
  comment_count: number;
  created_at: string;
};

export type AdminCourse = {
  id: number;
  level: number;
  level_name: string;
  title: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_published: number;
  lesson_count: number;
  created_at: string;
};

export type AdminLesson = {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  content: string | null;
  sort_order: number;
  is_published: number;
  created_at: string;
};

export type AdminPushToken = {
  id: number;
  token: string;
  platform: string;
  user_id: number | null;
  firstname: string | null;
  surname: string | null;
  email: string | null;
  created_at: string;
};

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function fetchAdminStats(token: string): Promise<AdminStats> {
  try {
    const { data } = await makeApi(token).get<AdminStats>('/stats');
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch stats'));
  }
}

// ─── Draws ────────────────────────────────────────────────────────────────────

export async function fetchAdminDraws(token: string, params: { source?: string; limit?: number; offset?: number } = {}) {
  try {
    const { data } = await makeApi(token).get('/draws/all', { params });
    return data as { total: number; limit: number; offset: number; draws: AdminDraw[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch draws'));
  }
}

export async function deleteAdminDraw(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/draws/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete draw'));
  }
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function fetchAdminUsers(token: string, params: { search?: string; limit?: number; offset?: number } = {}) {
  try {
    const { data } = await makeApi(token).get('/users', { params });
    return data as { total: number; limit: number; offset: number; users: AdminUser[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch users'));
  }
}

export async function deleteAdminUser(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/users/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete user'));
  }
}

// ─── Community ────────────────────────────────────────────────────────────────

export async function fetchAdminGroups(token: string, params: { limit?: number; offset?: number } = {}) {
  try {
    const { data } = await makeApi(token).get('/community/groups', { params });
    return data as { total: number; limit: number; offset: number; groups: AdminGroup[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch groups'));
  }
}

export async function deleteAdminGroup(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/community/groups/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete group'));
  }
}

export async function fetchAdminPosts(token: string, params: { limit?: number; offset?: number } = {}) {
  try {
    const { data } = await makeApi(token).get('/community/posts', { params });
    return data as { total: number; limit: number; offset: number; posts: AdminPost[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch posts'));
  }
}

export async function deleteAdminPost(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/community/posts/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete post'));
  }
}

// ─── University ───────────────────────────────────────────────────────────────

export async function fetchAdminCourses(token: string): Promise<AdminCourse[]> {
  try {
    const { data } = await makeApi(token).get('/university/courses');
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch courses'));
  }
}

export async function createAdminCourse(token: string, body: Partial<AdminCourse>): Promise<AdminCourse> {
  try {
    const { data } = await makeApi(token).post('/university/courses', body);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to create course'));
  }
}

export async function updateAdminCourse(token: string, id: number, body: Partial<AdminCourse>): Promise<AdminCourse> {
  try {
    const { data } = await makeApi(token).put(`/university/courses/${id}`, body);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to update course'));
  }
}

export async function deleteAdminCourse(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/university/courses/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete course'));
  }
}

export async function fetchAdminLessons(token: string, courseId: number): Promise<AdminLesson[]> {
  try {
    const { data } = await makeApi(token).get(`/university/courses/${courseId}/lessons`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch lessons'));
  }
}

export async function createAdminLesson(token: string, body: Partial<AdminLesson> & { course_id: number }): Promise<AdminLesson> {
  try {
    const { data } = await makeApi(token).post('/university/lessons', body);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to create lesson'));
  }
}

export async function updateAdminLesson(token: string, id: number, body: Partial<AdminLesson>): Promise<AdminLesson> {
  try {
    const { data } = await makeApi(token).put(`/university/lessons/${id}`, body);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to update lesson'));
  }
}

export async function deleteAdminLesson(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/university/lessons/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete lesson'));
  }
}

// ─── Push Tokens & Notifications ─────────────────────────────────────────────

export async function fetchAdminPushTokens(token: string, params: { limit?: number; offset?: number } = {}) {
  try {
    const { data } = await makeApi(token).get('/push-tokens', { params });
    return data as { total: number; limit: number; offset: number; tokens: AdminPushToken[] };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to fetch push tokens'));
  }
}

export async function deleteAdminPushToken(token: string, id: number) {
  try {
    const { data } = await makeApi(token).delete(`/push-tokens/${id}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, 'Failed to delete push token'));
  }
}

export async function broadcastNotification(token: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    const { data: res } = await makeApi(token).post('/notifications/broadcast', { title, body, data });
    return res as { message: string; sent: number; failed: number };
  } catch (err) {
    throw new Error(extractError(err, 'Failed to broadcast notification'));
  }
}
