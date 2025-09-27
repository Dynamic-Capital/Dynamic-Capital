"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils";
import type { SchoolLesson } from "@/integrations/supabase/queries";

interface CourseLessonListProps {
  lessons: SchoolLesson[];
  variant: "full" | "compact";
  canTrackProgress: boolean;
  showLessons: boolean;
  onToggleLesson?: (lessonId: string, nextCompleted: boolean) => void;
  isMutating?: boolean;
}

export function CourseLessonList({
  lessons,
  variant,
  canTrackProgress,
  showLessons,
  onToggleLesson,
  isMutating,
}: CourseLessonListProps) {
  if (!showLessons) {
    return null;
  }

  if (!lessons.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Lesson outline coming soon. Check back shortly for module details.
      </p>
    );
  }

  if (variant === "compact") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
        {lessons.map((lesson) => (
          <li key={lesson.id}>
            {lesson.contentUrl
              ? (
                <a
                  href={lesson.contentUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="font-medium text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {lesson.title}
                </a>
              )
              : (
                <span className="font-medium text-foreground">
                  {lesson.title}
                </span>
              )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="space-y-2">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "flex w-full items-center justify-start gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors",
              lesson.completed && "border-primary/40 bg-primary/10",
            )}
            disabled={!canTrackProgress || isMutating}
            onClick={() => onToggleLesson?.(lesson.id, !lesson.completed)}
          >
            {lesson.completed
              ? (
                <CheckCircle2
                  className="h-5 w-5 shrink-0 text-primary"
                  aria-hidden="true"
                />
              )
              : (
                <Circle
                  className="h-5 w-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {lesson.title}
              </span>
              {lesson.summary && (
                <span className="text-xs text-muted-foreground">
                  {lesson.summary}
                </span>
              )}
            </div>
          </Button>
        </li>
      ))}
    </ul>
  );
}
