"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchCourse,
  fetchProgress,
  getLevelColor,
  getLevelBadge,
  type CourseWithLessons,
  type UserProgress,
} from "@/lib/university";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [course, setCourse] = useState<CourseWithLessons | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourse(slug);
      setCourse(data);

      // Try to load progress
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const prog = await fetchProgress(token);
          setProgress(prog);
        } catch {
          // Progress loading is optional
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadCourse();
  }, [router, loadCourse]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <svg
          className="h-12 w-12 animate-spin text-indigo-600"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-muted-foreground font-medium">Loading course...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">
          {error || "Course not found"}
        </p>
        <Button onClick={loadCourse}>Retry</Button>
      </div>
    );
  }

  const color = getLevelColor(course.level);
  const badge = getLevelBadge(course.level);
  const completedLessonIds = new Set(
    progress.filter((p) => p.course_id === course.id).map((p) => p.lesson_id)
  );
  const completedCount = course.lessons.filter((l) =>
    completedLessonIds.has(l.id)
  ).length;
  const progressPercent =
    course.lessons.length > 0
      ? Math.round((completedCount / course.lessons.length) * 100)
      : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            href="/university"
            className="hover:text-foreground transition-colors"
          >
            University
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{course.title}</span>
        </nav>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
              style={{ backgroundColor: `${color}20` }}
            >
              {course.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {course.title}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge style={{ backgroundColor: color, color: "#fff" }}>
                  Level {course.level}
                </Badge>
                <Badge variant="secondary">{badge}</Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            {course.description || "Content coming soon..."}
          </p>

          {/* Progress bar */}
          {course.lessons.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {completedCount} of {course.lessons.length} lessons completed
                </span>
                <span className="font-medium" style={{ color }}>
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lessons List */}
        {course.lessons.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">📝</p>
              <p className="text-lg font-medium text-foreground">
                Lessons coming soon
              </p>
              <p className="text-muted-foreground mt-1">
                The content for this course is being prepared. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {course.lessons.map((lesson, index) => {
              const isCompleted = completedLessonIds.has(lesson.id);
              return (
                <Link
                  key={lesson.slug}
                  href={`/university/${course.slug}/${lesson.slug}`}
                >
                  <Card
                    className={`border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
                      isCompleted ? "bg-green-50 dark:bg-green-950/20" : ""
                    }`}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 py-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? "✓" : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {lesson.title}
                        </CardTitle>
                      </div>
                      <span className="text-muted-foreground text-sm">→</span>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
