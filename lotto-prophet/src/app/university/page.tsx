"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchCourses,
  fetchProgress,
  getLevelColor,
  getLevelBadge,
  type Course,
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

export default function UniversityPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/signin"); return; }
    load(token);
  }, [router]);

  async function load(token: string) {
    try {
      setLoading(true);
      setError(null);
      const [data, prog] = await Promise.all([
        fetchCourses(),
        fetchProgress(token).catch(() => [] as UserProgress[]),
      ]);
      setCourses(data);
      setProgress(prog);
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Spinner label="Loading university..." />;

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={() => load(localStorage.getItem("token") ?? "")}>Retry</Button>
      </div>
    );
  }

  const completedIds = new Set(progress.map((p) => p.lesson_id));
  const totalLessons = courses.reduce((sum, c) => sum + (c.lesson_count ?? 0), 0);
  const totalCompleted = progress.length;

  const levels = [1, 2, 3];
  const coursesByLevel = levels.map((level) => ({
    level,
    courses: courses.filter((c) => c.level === level),
  }));

  // Find in-progress course (has some but not all lessons completed)
  const inProgressCourse = courses.find((c) => {
    const done = progress.filter((p) => p.course_id === c.id).length;
    return done > 0 && done < c.lesson_count;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">🏫 Lotto Prophet University</h1>
          <p className="text-muted-foreground mt-1">
            Learn lottery analysis from the ground up — Foundation, Lapping, and Game Theory with AI.
          </p>
        </div>

        {/* Overall progress bar */}
        {totalLessons > 0 && (
          <Card className="border-0 shadow-sm mb-8">
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">Overall Progress</p>
                <span className="text-sm text-muted-foreground">
                  {totalCompleted} / {totalLessons} lessons completed
                </span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                  style={{ width: `${totalLessons > 0 ? (totalCompleted / totalLessons) * 100 : 0}%` }}
                />
              </div>
              {inProgressCourse && (
                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Continue where you left off</p>
                    <p className="text-sm font-medium mt-0.5">{inProgressCourse.title}</p>
                  </div>
                  <Link href={`/university/${inProgressCourse.slug}`}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Continue →
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Levels */}
        <div className="space-y-10">
          {coursesByLevel.map(({ level, courses: levelCourses }) => {
            if (levelCourses.length === 0) return null;
            const color = getLevelColor(level);
            const badge = getLevelBadge(level);

            return (
              <section key={level}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {level}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      Level {level} — {levelCourses[0]?.level_name}
                    </h2>
                    <Badge variant="secondary" className="text-xs" style={{ color }}>
                      {badge}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelCourses.map((course) => {
                    const done = progress.filter((p) => p.course_id === course.id).length;
                    const pct = course.lesson_count > 0 ? Math.round((done / course.lesson_count) * 100) : 0;
                    const isComplete = done > 0 && done >= course.lesson_count;

                    return (
                      <Link key={course.slug} href={`/university/${course.slug}`}>
                        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <div
                              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                              style={{ backgroundColor: `${color}20` }}
                            >
                              {course.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                                {course.title}
                              </CardTitle>
                              {isComplete && (
                                <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-0.5">
                                  ✓ Completed
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {course.description || "Content coming soon..."}
                            </p>

                            {/* Progress bar */}
                            {course.lesson_count > 0 && (
                              <div className="mb-3">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>{done}/{course.lesson_count} lessons</span>
                                  <span style={{ color }}>{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            )}

                            <Badge variant="outline" className="text-xs">
                              {course.lesson_count} {course.lesson_count === 1 ? "lesson" : "lessons"}
                            </Badge>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <p className="mt-12 text-center text-muted-foreground text-sm">
          Course content is actively being developed. Check back soon!
        </p>
      </div>
    </div>
  );
}
