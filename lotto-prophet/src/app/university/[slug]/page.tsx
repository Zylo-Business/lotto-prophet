"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function CourseDetailPage() {
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();

  const [course, setCourse] = useState<CourseWithLessons | null>(null);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const [data, prog] = await Promise.all([
        fetchCourse(slug),
        token ? fetchProgress(token).catch(() => [] as UserProgress[]) : Promise.resolve([]),
      ]);
      setCourse(data);
      setProgress(prog);
    } catch (err: any) {
      setError(err.message || "Failed to load course");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.replace("/signin"); return; }
    load();
  }, [router, load]);

  if (loading) return <Spinner label="Loading course..." />;

  if (error || !course) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error || "Course not found"}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  const color = getLevelColor(course.level);
  const badge = getLevelBadge(course.level);
  const completedIds = new Set(
    progress.filter((p) => p.course_id === course.id).map((p) => p.lesson_id)
  );
  const completedCount = course.lessons.filter((l) => completedIds.has(l.id)).length;
  const progressPercent = course.lessons.length > 0
    ? Math.round((completedCount / course.lessons.length) * 100)
    : 0;
  const isCourseComplete = course.lessons.length > 0 && completedCount >= course.lessons.length;

  // First incomplete lesson for the CTA
  const nextLesson = course.lessons.find((l) => !completedIds.has(l.id)) ?? course.lessons[0];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/university" className="hover:text-foreground transition-colors">University</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{course.title}</span>
        </nav>

        {/* Course Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              {course.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge style={{ backgroundColor: color, color: "#fff" }}>Level {course.level}</Badge>
                <Badge variant="secondary">{badge}</Badge>
                {isCourseComplete && (
                  <Badge className="bg-green-600 text-white hover:bg-green-600">✓ Completed</Badge>
                )}
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            {course.description || "Content coming soon..."}
          </p>

          {/* Progress bar */}
          {course.lessons.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">
                  {completedCount} of {course.lessons.length} lessons completed
                </span>
                <span className="font-semibold" style={{ color }}>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )}

          {/* Start / Continue CTA */}
          {nextLesson && (
            <div className="mt-5">
              <Link href={`/university/${course.slug}/${nextLesson.slug}`}>
                <Button
                  className="h-11 px-6 text-white"
                  style={{ backgroundColor: color }}
                >
                  {completedCount === 0
                    ? "Start Course →"
                    : isCourseComplete
                    ? "Review Course →"
                    : "Continue →"}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Lessons List */}
        {course.lessons.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">📝</p>
              <p className="text-lg font-medium">Lessons coming soon</p>
              <p className="text-muted-foreground mt-1 text-sm">
                The content for this course is being prepared. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Lessons
            </h2>
            <div className="space-y-2.5">
              {course.lessons.map((lesson, index) => {
                const isCompleted = completedIds.has(lesson.id);
                const isNext = lesson.id === nextLesson?.id && !isCourseComplete;
                return (
                  <Link key={lesson.slug} href={`/university/${course.slug}/${lesson.slug}`}>
                    <Card
                      className={`border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                        isCompleted ? "bg-green-50 dark:bg-green-950/20" : ""
                      }`}
                      style={isNext ? { outline: `2px solid ${color}`, outlineOffset: "1px" } : {}}
                    >
                      <CardHeader className="flex flex-row items-center gap-4 py-3.5 px-5">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        <CardTitle className="text-base font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-1">
                          {lesson.title}
                        </CardTitle>
                        {isNext && (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            Up Next
                          </span>
                        )}
                        <span className="text-muted-foreground text-sm shrink-0">→</span>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
