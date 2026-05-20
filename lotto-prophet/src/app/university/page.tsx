"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  fetchCourses,
  getLevelColor,
  getLevelBadge,
  type Course,
} from "@/lib/university";

export default function UniversityPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/signin");
      return;
    }
    loadCourses();
  }, [router]);

  async function loadCourses() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
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
        <p className="text-muted-foreground font-medium">Loading university...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-4 bg-muted/30">
        <p className="text-destructive font-medium">{error}</p>
        <Button onClick={loadCourses}>Retry</Button>
      </div>
    );
  }

  // Group courses by level
  const levels = [1, 2, 3];
  const coursesByLevel = levels.map((level) => ({
    level,
    courses: courses.filter((c) => c.level === level),
  }));

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            🏫 Lotto Prophet University
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn lottery analysis from the ground up — Foundation, Lapping, and
            Game Theory with AI.
          </p>
        </div>

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
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ color }}
                    >
                      {badge}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelCourses.map((course) => (
                    <Link
                      key={course.slug}
                      href={`/university/${course.slug}`}
                    >
                      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group h-full">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            {course.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {course.title}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {course.description || "Content coming soon..."}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge
                              variant="outline"
                              className="text-xs"
                            >
                              {course.lesson_count}{" "}
                              {course.lesson_count === 1 ? "lesson" : "lessons"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Coming soon note */}
        <div className="mt-12 text-center text-muted-foreground text-sm">
          <p>Course content is actively being developed. Check back soon!</p>
        </div>
      </div>
    </div>
  );
}
