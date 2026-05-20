import axios, { AxiosError } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────

export interface UniversityLevel {
  level: number;
  name: string;
  course_count: number;
  published_count: number;
  color: string;
  icon: string;
}

export interface Course {
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
}

export interface CourseWithLessons extends Course {
  lessons: LessonSummary[];
}

export interface LessonSummary {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  sort_order: number;
  is_published: number;
  created_at: string;
}

export interface Lesson extends LessonSummary {
  content: string | null;
  course_title: string;
  course_slug: string;
  level: number;
  level_name: string;
  prev: LessonSummary | null;
  next: LessonSummary | null;
}

export interface UserProgress {
  lesson_id: number;
  completed_at: string;
  course_id: number;
}

// ─── Base URL ────────────────────────────────────────────────────────

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

console.log('[university] API base URL:', `${BASE_URL}/api/university`);

const api = axios.create({
  baseURL: `${BASE_URL}/api/university`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

/** Extract a readable error message from an Axios error */
function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    if (err.response?.data?.error) return err.response.data.error;
    if (err.response?.data?.message) return err.response.data.message;
    if (err.code === 'ECONNABORTED') return 'Request timed out. Check your connection.';
    if (err.code === 'ERR_NETWORK')
      return `Cannot reach the server at ${BASE_URL}. Make sure the server is running and your device is on the same Wi-Fi network.`;
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

// ─── Display helpers ─────────────────────────────────────────────────

const LEVEL_COLORS: Record<number, string> = {
  1: '#10B981',
  2: '#F59E0B',
  3: '#6C63FF',
};

const LEVEL_ICONS: Record<number, string> = {
  1: 'school',
  2: 'sync',
  3: 'hardware-chip',
};

const LEVEL_BADGES: Record<number, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
};

export function getLevelColor(level: number): string {
  return LEVEL_COLORS[level] ?? '#6B7280';
}

export function getLevelIcon(level: number): string {
  return LEVEL_ICONS[level] ?? 'book';
}

export function getLevelBadge(level: number): string {
  return LEVEL_BADGES[level] ?? `Level ${level}`;
}

// ─── API functions ───────────────────────────────────────────────────

export async function fetchCourses(): Promise<Course[]> {
  try {
    const { data } = await api.get('/courses');
    return data;
  } catch (err) {
    console.error('[university] fetchCourses error:', err);
    throw new Error(extractError(err, 'Failed to fetch courses'));
  }
}

export async function fetchCourse(slug: string): Promise<CourseWithLessons> {
  try {
    const { data } = await api.get(`/courses/${slug}`);
    return data;
  } catch (err) {
    console.error('[university] fetchCourse error:', err);
    throw new Error(extractError(err, 'Failed to fetch course'));
  }
}

export async function fetchLesson(courseSlug: string, lessonSlug: string): Promise<Lesson> {
  try {
    const { data } = await api.get(`/lessons/${courseSlug}/${lessonSlug}`);
    return data;
  } catch (err) {
    console.error('[university] fetchLesson error:', err);
    throw new Error(extractError(err, 'Failed to fetch lesson'));
  }
}

export async function fetchProgress(token: string): Promise<UserProgress[]> {
  try {
    const { data } = await api.get('/progress', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (err) {
    console.error('[university] fetchProgress error:', err);
    throw new Error(extractError(err, 'Failed to fetch progress'));
  }
}

export async function markLessonComplete(lessonId: number, token: string): Promise<void> {
  try {
    await api.post(`/progress/${lessonId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('[university] markLessonComplete error:', err);
    throw new Error(extractError(err, 'Failed to mark lesson complete'));
  }
}

// Placeholder default export so Expo Router won't treat this as a screen
export default function _UniversityLibRoute() {
  return null;
}
