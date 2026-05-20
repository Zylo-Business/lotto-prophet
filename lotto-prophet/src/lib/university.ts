import axios from "axios";

// ─── Types ───
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

// ─── API client ───
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const api = axios.create({
  baseURL: `${BASE_URL}/api/university`,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

function extractError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.error || err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}

// ─── Display helpers ───
const LEVEL_COLORS: Record<number, string> = {
  1: "#10B981",
  2: "#F59E0B",
  3: "#6C63FF",
};

const LEVEL_ICONS: Record<number, string> = {
  1: "🎓",
  2: "🔄",
  3: "🤖",
};

const LEVEL_BADGES: Record<number, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
};

export function getLevelColor(level: number): string {
  return LEVEL_COLORS[level] ?? "#6B7280";
}

export function getLevelIcon(level: number): string {
  return LEVEL_ICONS[level] ?? "📚";
}

export function getLevelBadge(level: number): string {
  return LEVEL_BADGES[level] ?? `Level ${level}`;
}

// ─── API functions ───
export async function fetchLevels(): Promise<UniversityLevel[]> {
  try {
    const { data } = await api.get("/levels");
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch levels"));
  }
}

export async function fetchCourses(): Promise<Course[]> {
  try {
    const { data } = await api.get("/courses");
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch courses"));
  }
}

export async function fetchCourse(slug: string): Promise<CourseWithLessons> {
  try {
    const { data } = await api.get(`/courses/${slug}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch course"));
  }
}

export async function fetchLesson(courseSlug: string, lessonSlug: string): Promise<Lesson> {
  try {
    const { data } = await api.get(`/lessons/${courseSlug}/${lessonSlug}`);
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch lesson"));
  }
}

export async function fetchProgress(token: string): Promise<UserProgress[]> {
  try {
    const { data } = await api.get("/progress", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (err) {
    throw new Error(extractError(err, "Failed to fetch progress"));
  }
}

export async function markLessonComplete(lessonId: number, token: string): Promise<void> {
  try {
    await api.post(`/progress/${lessonId}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(extractError(err, "Failed to mark lesson complete"));
  }
}
