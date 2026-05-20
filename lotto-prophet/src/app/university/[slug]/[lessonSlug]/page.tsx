"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchLesson,
  markLessonComplete,
  getLevelColor,
  type Lesson,
} from "@/lib/university";

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const courseSlug = params.slug as string;
  const lessonSlug = params.lessonSlug as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLesson = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchLesson(courseSlug, lessonSlug);
      setLesson(data);
    } catch (err: any) {
      setError(err.message || "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadLesson();
  }, [router, loadLesson]);

  async function handleComplete() {
    if (!lesson) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setCompleting(true);
      await markLessonComplete(lesson.id, token);
      setCompleted(true);
    } catch (err: any) {
      // Silently fail — user can try again
    } finally {
      setCompleting(false);
    }
  }

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
        <p className="text-muted-foreground font-medium">Loading lesson...</p>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">
          {error || "Lesson not found"}
        </p>
        <Button onClick={loadLesson}>Retry</Button>
      </div>
    );
  }

  const color = getLevelColor(lesson.level);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link
            href="/university"
            className="hover:text-foreground transition-colors"
          >
            University
          </Link>
          <span>/</span>
          <Link
            href={`/university/${lesson.course_slug}`}
            className="hover:text-foreground transition-colors"
          >
            {lesson.course_title}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{lesson.title}</span>
        </nav>

        {/* Lesson Header */}
        <div className="mb-8">
          <Badge
            className="mb-3"
            style={{ backgroundColor: color, color: "#fff" }}
          >
            Level {lesson.level} — {lesson.level_name}
          </Badge>
          <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>
        </div>

        {/* Lesson Content */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="py-8">
            {lesson.content ? (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-lg font-medium text-foreground">
                  Content coming soon
                </p>
                <p className="text-muted-foreground mt-1">
                  This lesson's content is being prepared. Check back soon!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mark Complete */}
        {lesson.content && (
          <div className="flex justify-center mb-8">
            <Button
              onClick={handleComplete}
              disabled={completing || completed}
              className="px-8"
              style={
                completed
                  ? { backgroundColor: "#10B981" }
                  : { backgroundColor: color }
              }
            >
              {completed
                ? "✓ Completed"
                : completing
                ? "Saving..."
                : "Mark as Complete"}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {lesson.prev ? (
            <Button variant="outline" asChild>
              <Link
                href={`/university/${lesson.course_slug}/${lesson.prev.slug}`}
              >
                ← {lesson.prev.title}
              </Link>
            </Button>
          ) : (
            <div />
          )}
          {lesson.next ? (
            <Button variant="outline" asChild>
              <Link
                href={`/university/${lesson.course_slug}/${lesson.next.slug}`}
              >
                {lesson.next.title} →
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/university/${lesson.course_slug}`}>
                Back to Course
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
