"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchLesson,
  markLessonComplete,
  getLevelColor,
  estimateReadingTime,
  type Lesson,
} from "@/lib/university";

function Spinner({ label }: { label: string }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
      <svg className="h-10 w-10 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

export default function LessonPage() {
  const router = useRouter();
  const { slug: courseSlug, lessonSlug } = useParams<{ slug: string; lessonSlug: string }>();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
    if (!localStorage.getItem("token")) { router.replace("/signin"); return; }
    load();
  }, [router, load]);

  async function handleComplete() {
    if (!lesson) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      setCompleting(true);
      await markLessonComplete(lesson.id, token);
      setCompleted(true);
    } catch {
      // silently ignore — user can retry
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <Spinner label="Loading lesson..." />;

  if (error || !lesson) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error || "Lesson not found"}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  const color = getLevelColor(lesson.level);
  const readingTime = estimateReadingTime(lesson.content);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-3xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/university" className="hover:text-foreground transition-colors">University</Link>
          <span>/</span>
          <Link href={`/university/${lesson.course_slug}`} className="hover:text-foreground transition-colors">
            {lesson.course_title}
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[160px]">{lesson.title}</span>
        </nav>

        {/* Lesson Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <Badge style={{ backgroundColor: color, color: "#fff" }}>
              Level {lesson.level} — {lesson.level_name}
            </Badge>
            {lesson.total_lessons > 0 && (
              <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                Lesson {lesson.lesson_number} of {lesson.total_lessons}
              </span>
            )}
            {lesson.content && readingTime > 0 && (
              <span className="text-xs text-muted-foreground">
                📖 {readingTime} min read
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>

          {/* Mini lesson progress bar */}
          {lesson.total_lessons > 0 && (
            <div className="mt-3 h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(lesson.lesson_number / lesson.total_lessons) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          )}
        </div>

        {/* Lesson Content */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="py-8 px-8">
            {lesson.content ? (
              <div
                className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-li:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: lesson.content }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">📝</p>
                <p className="text-lg font-medium">Content coming soon</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  This lesson is being prepared. Check back soon!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mark Complete + next-lesson CTA */}
        {lesson.content && (
          <div className="mb-8">
            {completed ? (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-semibold text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Lesson Completed!
                </div>
                {lesson.next && (
                  <Link href={`/university/${lesson.course_slug}/${lesson.next.slug}`} className="w-full sm:w-auto">
                    <Button className="w-full text-white" style={{ backgroundColor: color }}>
                      Next: {lesson.next.title} →
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={completing}
                className="px-8 h-11 text-white"
                style={{ backgroundColor: color }}
              >
                {completing ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Mark as Complete"
                )}
              </Button>
            )}
          </div>
        )}

        {/* Prev / Next navigation */}
        <div className="flex items-center justify-between gap-4">
          {lesson.prev ? (
            <Button variant="outline" asChild className="flex-1 max-w-[48%] justify-start">
              <Link href={`/university/${lesson.course_slug}/${lesson.prev.slug}`}>
                <span className="truncate">← {lesson.prev.title}</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/university/${lesson.course_slug}`}>← Back to Course</Link>
            </Button>
          )}
          {lesson.next ? (
            <Button variant="outline" asChild className="flex-1 max-w-[48%] justify-end">
              <Link href={`/university/${lesson.course_slug}/${lesson.next.slug}`}>
                <span className="truncate">{lesson.next.title} →</span>
              </Link>
            </Button>
          ) : (
            <Button variant="outline" asChild>
              <Link href={`/university/${lesson.course_slug}`}>Back to Course →</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
