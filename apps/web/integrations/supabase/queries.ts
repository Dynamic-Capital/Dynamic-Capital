import { supabase } from "./client";
import type { Database } from "./types";

type SchoolLessonRow = Database["public"]["Tables"]["school_lessons"]["Row"];
type CourseProgressRow = Database["public"]["Tables"]["course_progress"]["Row"];

export interface SchoolLesson {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sequence: number;
  contentUrl: string | null;
  estimatedMinutes: number | null;
  completed: boolean;
}

export interface SchoolCourse {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  sequence: number;
  startUrl: string;
  estimatedMinutes: number | null;
  lessons: SchoolLesson[];
  completedLessons: number;
  totalLessons: number;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function logChatMessage(params: {
  telegramUserId?: string | number;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { telegramUserId, sessionId, role, content } = params;
  const { error } = await supabase.from("user_interactions").insert({
    interaction_type: "ai_chat",
    telegram_user_id: String(telegramUserId ?? "anonymous"),
    session_id: sessionId,
    page_context: "chat_widget",
    interaction_data: { role, content },
  });
  if (error) console.warn("Failed to log chat message", error);
}

export async function getSchoolCurriculum(
  userId?: string,
): Promise<SchoolCourse[]> {
  const { data, error } = await supabase
    .from("school_courses")
    .select(
      `id, slug, title, summary, sequence, start_url, estimated_minutes,
        school_lessons (id, slug, title, summary, sequence, content_url, estimated_minutes)`,
    )
    .order("sequence", { ascending: true })
    .order("sequence", { referencedTable: "school_lessons", ascending: true });

  if (error) throw error;

  const lessonProgress = new Set<string>();

  if (userId) {
    const { data: progressRows, error: progressError } = await supabase
      .from("course_progress")
      .select("lesson_id")
      .eq("user_id", userId);

    if (progressError) throw progressError;

    for (const row of progressRows ?? []) {
      if (row?.lesson_id) {
        lessonProgress.add(row.lesson_id);
      }
    }
  }

  const courses: SchoolCourse[] = (data ?? []).map((course) => {
    const lessons = (course.school_lessons ?? [])
      .filter((lesson): lesson is SchoolLessonRow => Boolean(lesson))
      .map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        sequence: lesson.sequence,
        contentUrl: lesson.content_url,
        estimatedMinutes: lesson.estimated_minutes,
        completed: lessonProgress.has(lesson.id),
      }))
      .sort((a, b) => a.sequence - b.sequence);

    const completedLessons = lessons.filter((lesson) =>
      lesson.completed
    ).length;

    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      sequence: course.sequence,
      startUrl: course.start_url,
      estimatedMinutes: course.estimated_minutes,
      lessons,
      completedLessons,
      totalLessons: lessons.length,
    } satisfies SchoolCourse;
  });

  return courses.sort((a, b) => a.sequence - b.sequence);
}

export async function setLessonCompletion(params: {
  userId: string;
  courseId: string;
  lessonId: string;
  completed: boolean;
}) {
  const { userId, courseId, lessonId, completed } = params;

  if (completed) {
    const { error } = await supabase
      .from("course_progress")
      .upsert(
        {
          user_id: userId,
          course_id: courseId,
          lesson_id: lessonId,
          status: "completed",
          completed_at: new Date().toISOString(),
        } satisfies Partial<CourseProgressRow>,
        { onConflict: "user_id,lesson_id" },
      );

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from("course_progress")
    .delete()
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);

  if (error) throw error;
}
