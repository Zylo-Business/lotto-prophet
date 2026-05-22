"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAdminCourses, createAdminCourse, updateAdminCourse, deleteAdminCourse,
  fetchAdminLessons, createAdminLesson, updateAdminLesson, deleteAdminLesson,
  type AdminCourse, type AdminLesson,
} from "@/lib/admin";

type CourseForm = { level: string; level_name: string; title: string; slug: string; description: string; icon: string; sort_order: string; is_published: boolean };
type LessonForm = { title: string; slug: string; content: string; sort_order: string; is_published: boolean };

const emptyCourseForm = (): CourseForm => ({ level: "1", level_name: "Beginner", title: "", slug: "", description: "", icon: "📚", sort_order: "0", is_published: true });
const emptyLessonForm = (): LessonForm => ({ title: "", slug: "", content: "", sort_order: "0", is_published: true });

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

function DeleteModal({ title, subtitle, onConfirm, onCancel }: { title: string; subtitle: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white dark:bg-gray-800 shadow-xl p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}<br />This action cannot be undone.</p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700">Yes, delete</button>
            <button onClick={onCancel} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminUniversityPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm());
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [savingCourse, setSavingCourse] = useState(false);
  const [deleteCourseTarget, setDeleteCourseTarget] = useState<AdminCourse | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLessonForm());
  const [editingLesson, setEditingLesson] = useState<AdminLesson | null>(null);
  const [lessonFormOpen, setLessonFormOpen] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<AdminLesson | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.replace("/signin"); return; }
    setToken(t);
  }, [router]);

  const loadCourses = useCallback(async (t: string) => {
    setLoading(true); setError(null);
    try { setCourses(await fetchAdminCourses(t)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (token) loadCourses(token); }, [token, loadCourses]);

  async function loadLessons(t: string, courseId: number) {
    setLessonsLoading(true);
    try { setLessons(await fetchAdminLessons(t, courseId)); }
    catch (e: any) { setError(e.message); }
    finally { setLessonsLoading(false); }
  }

  function openNewCourse() {
    setEditingCourse(null); setCourseForm(emptyCourseForm()); setCourseFormOpen(true);
    setError(null); setSuccess(null);
  }

  function openEditCourse(c: AdminCourse) {
    setEditingCourse(c);
    setCourseForm({ level: String(c.level), level_name: c.level_name, title: c.title, slug: c.slug, description: c.description ?? "", icon: c.icon, sort_order: String(c.sort_order), is_published: !!c.is_published });
    setCourseFormOpen(true); setError(null); setSuccess(null);
  }

  async function saveCourse() {
    if (!token) return;
    setSavingCourse(true); setError(null); setSuccess(null);
    const body = { level: Number(courseForm.level), level_name: courseForm.level_name, title: courseForm.title, slug: courseForm.slug || slugify(courseForm.title), description: courseForm.description || null, icon: courseForm.icon, sort_order: Number(courseForm.sort_order), is_published: courseForm.is_published ? 1 : 0 };
    try {
      if (editingCourse) {
        const updated = await updateAdminCourse(token, editingCourse.id, body);
        setCourses(prev => prev.map(c => c.id === updated.id ? { ...updated, lesson_count: c.lesson_count } : c));
        setSuccess("Course updated.");
      } else {
        const created = await createAdminCourse(token, body);
        setCourses(prev => [...prev, { ...created, lesson_count: 0 }]);
        setSuccess("Course created.");
      }
      setCourseFormOpen(false);
    } catch (e: any) { setError(e.message); }
    finally { setSavingCourse(false); }
  }

  async function deleteCourse() {
    if (!token || !deleteCourseTarget) return;
    try {
      await deleteAdminCourse(token, deleteCourseTarget.id);
      setCourses(prev => prev.filter(c => c.id !== deleteCourseTarget.id));
      if (selectedCourse?.id === deleteCourseTarget.id) setSelectedCourse(null);
    } catch (e: any) { setError(e.message); }
    finally { setDeleteCourseTarget(null); }
  }

  function selectCourse(c: AdminCourse) {
    setSelectedCourse(c);
    if (token) loadLessons(token, c.id);
    setLessonFormOpen(false); setEditingLesson(null);
  }

  function openNewLesson() {
    setEditingLesson(null); setLessonForm(emptyLessonForm()); setLessonFormOpen(true);
    setError(null); setSuccess(null);
  }

  function openEditLesson(l: AdminLesson) {
    setEditingLesson(l);
    setLessonForm({ title: l.title, slug: l.slug, content: l.content ?? "", sort_order: String(l.sort_order), is_published: !!l.is_published });
    setLessonFormOpen(true); setError(null); setSuccess(null);
  }

  async function saveLesson() {
    if (!token || !selectedCourse) return;
    setSavingLesson(true); setError(null); setSuccess(null);
    const body = { title: lessonForm.title, slug: lessonForm.slug || slugify(lessonForm.title), content: lessonForm.content || null, sort_order: Number(lessonForm.sort_order), is_published: lessonForm.is_published ? 1 : 0 };
    try {
      if (editingLesson) {
        const updated = await updateAdminLesson(token, editingLesson.id, body);
        setLessons(prev => prev.map(l => l.id === updated.id ? updated : l));
        setSuccess("Lesson updated.");
      } else {
        const created = await createAdminLesson(token, { ...body, course_id: selectedCourse.id });
        setLessons(prev => [...prev, created]);
        setCourses(prev => prev.map(c => c.id === selectedCourse.id ? { ...c, lesson_count: c.lesson_count + 1 } : c));
        setSuccess("Lesson created.");
      }
      setLessonFormOpen(false);
    } catch (e: any) { setError(e.message); }
    finally { setSavingLesson(false); }
  }

  async function deleteLesson() {
    if (!token || !deleteLessonTarget || !selectedCourse) return;
    try {
      await deleteAdminLesson(token, deleteLessonTarget.id);
      setLessons(prev => prev.filter(l => l.id !== deleteLessonTarget.id));
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? { ...c, lesson_count: Math.max(0, c.lesson_count - 1) } : c));
    } catch (e: any) { setError(e.message); }
    finally { setDeleteLessonTarget(null); }
  }

  return (
    <>
      {deleteCourseTarget && (
        <DeleteModal
          title={`Delete "${deleteCourseTarget.title}"?`}
          subtitle={`${deleteCourseTarget.lesson_count} lesson(s) will be removed`}
          onConfirm={deleteCourse}
          onCancel={() => setDeleteCourseTarget(null)}
        />
      )}
      {deleteLessonTarget && (
        <DeleteModal
          title={`Delete "${deleteLessonTarget.title}"?`}
          subtitle="This lesson will be permanently removed"
          onConfirm={deleteLesson}
          onCancel={() => setDeleteLessonTarget(null)}
        />
      )}

      {/* Course Form Modal */}
      {courseFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingCourse ? "Edit Course" : "New Course"}</h3>
              <button onClick={() => setCourseFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Level</label>
                  <select className={inputCls} value={courseForm.level} onChange={e => setCourseForm({ ...courseForm, level: e.target.value })}>
                    <option value="1">1 — Beginner</option>
                    <option value="2">2 — Intermediate</option>
                    <option value="3">3 — Advanced</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Icon (emoji)</label>
                  <input className={inputCls} value={courseForm.icon} onChange={e => setCourseForm({ ...courseForm, icon: e.target.value })} placeholder="📚" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value, slug: slugify(e.target.value) })} placeholder="Course title" />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input className={`${inputCls} font-mono`} value={courseForm.slug} onChange={e => setCourseForm({ ...courseForm, slug: e.target.value })} placeholder="course-slug" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Short description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <input type="number" className={inputCls} value={courseForm.sort_order} onChange={e => setCourseForm({ ...courseForm, sort_order: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id="course_pub" checked={courseForm.is_published} onChange={e => setCourseForm({ ...courseForm, is_published: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
                  <label htmlFor="course_pub" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Published</label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={saveCourse} disabled={savingCourse || !courseForm.title} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {savingCourse ? "Saving..." : "Save Course"}
              </button>
              <button onClick={() => setCourseFormOpen(false)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Form Modal */}
      {lessonFormOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-gray-800 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingLesson ? "Edit Lesson" : `New Lesson — ${selectedCourse.title}`}
              </h3>
              <button onClick={() => setLessonFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value, slug: slugify(e.target.value) })} placeholder="Lesson title" />
              </div>
              <div>
                <label className={labelCls}>Slug</label>
                <input className={`${inputCls} font-mono`} value={lessonForm.slug} onChange={e => setLessonForm({ ...lessonForm, slug: e.target.value })} placeholder="lesson-slug" />
              </div>
              <div>
                <label className={labelCls}>Content (Markdown)</label>
                <textarea className={`${inputCls} min-h-[200px] resize-y font-mono`} value={lessonForm.content} onChange={e => setLessonForm({ ...lessonForm, content: e.target.value })} placeholder="Write lesson content in Markdown..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sort Order</label>
                  <input type="number" className={inputCls} value={lessonForm.sort_order} onChange={e => setLessonForm({ ...lessonForm, sort_order: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <input type="checkbox" id="lesson_pub" checked={lessonForm.is_published} onChange={e => setLessonForm({ ...lessonForm, is_published: e.target.checked })} className="h-4 w-4 accent-indigo-600" />
                  <label htmlFor="lesson_pub" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">Published</label>
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={saveLesson} disabled={savingLesson || !lessonForm.title} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {savingLesson ? "Saving..." : "Save Lesson"}
              </button>
              <button onClick={() => setLessonFormOpen(false)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="block items-center justify-between border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-4 sm:flex">
        <div className="mb-3 sm:mb-0">
          <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Admin</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            <span className="text-gray-900 dark:text-white font-medium">University</span>
          </nav>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            University {!loading && <span className="text-gray-500 dark:text-gray-400 font-normal text-base">({courses.length} courses)</span>}
          </h1>
        </div>
        <button onClick={openNewCourse}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Course
        </button>
      </div>

      {error && !courseFormOpen && !lessonFormOpen && (
        <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mx-4 mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
        {/* Courses panel */}
        <div>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Courses</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />)}</div>
          ) : courses.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">No courses yet.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {courses.map(c => (
                <div
                  key={c.id}
                  onClick={() => selectCourse(c)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${selectedCourse?.id === c.id ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-l-4 border-transparent"}`}
                >
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{c.level_name} · {c.lesson_count} lessons</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.is_published ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                      {c.is_published ? "Published" : "Draft"}
                    </span>
                    <button onClick={() => openEditCourse(c)} className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteCourseTarget(c)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lessons panel */}
        <div>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              {selectedCourse ? `Lessons — ${selectedCourse.title}` : "Lessons"}
            </h2>
            {selectedCourse && (
              <button onClick={openNewLesson}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                New Lesson
              </button>
            )}
          </div>
          {!selectedCourse ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">Select a course to manage its lessons.</p>
          ) : lessonsLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse" />)}</div>
          ) : lessons.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-12">No lessons yet. Add one above.</p>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {lessons.map(l => (
                <div key={l.id} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <span className="text-xs font-mono text-gray-400 w-6 text-center shrink-0">{l.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{l.title}</p>
                    <p className="text-xs font-mono text-gray-500 dark:text-gray-400">{l.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${l.is_published ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}`}>
                      {l.is_published ? "Published" : "Draft"}
                    </span>
                    <button onClick={() => openEditLesson(l)} className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleteLessonTarget(l)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
