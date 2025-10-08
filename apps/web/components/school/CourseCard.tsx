"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/utils";
import type { SchoolCourse } from "@/integrations/supabase/queries";

import { CourseLessonList } from "./CourseLessonList";
import { ProgressBadge } from "./ProgressBadge";

interface CourseCardProps {
  course: SchoolCourse;
  index: number;
  totalCourses: number;
  variant: "full" | "compact";
  isExpanded: boolean;
  onToggleExpanded?: () => void;
  canTrackProgress: boolean;
  onToggleLesson?: (lessonId: string, nextCompleted: boolean) => void;
  isMutating?: boolean;
}

export function CourseCard({
  course,
  index,
  totalCourses,
  variant,
  isExpanded,
  onToggleExpanded,
  canTrackProgress,
  onToggleLesson,
  isMutating,
}: CourseCardProps) {
  const progressValue = useMemo(() => {
    if (course.totalLessons === 0) return 0;
    return Math.round((course.completedLessons / course.totalLessons) * 100);
  }, [course.completedLessons, course.totalLessons]);

  const showLessons = variant === "compact" || isExpanded;

  return (
    <Card
      className={cn(
        "flex flex-col border border-border/60 bg-background/80 shadow-sm transition-colors",
        variant === "compact" && "bg-transparent shadow-none",
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-xl font-semibold">
              Course {index + 1} of {totalCourses} — {course.title}
            </CardTitle>
            <ProgressBadge
              completed={course.completedLessons}
              total={course.totalLessons}
            />
          </div>
          {course.summary && (
            <CardDescription className="max-w-3xl text-base">
              {course.summary}
            </CardDescription>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {variant === "full"
          ? (
            canTrackProgress
              ? (
                <Progress
                  value={course.completedLessons}
                  max={course.totalLessons || 1}
                  label="Your progress"
                  wrapperClassName="max-w-xl"
                  indicatorClassName="bg-gradient-to-r from-primary via-primary to-primary/70"
                />
              )
              : (
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                  Sign in to unlock progress tracking for this course.
                </div>
              )
          )
          : null}
        {variant === "compact" && !canTrackProgress && (
          <p className="text-sm text-muted-foreground">
            Sign in to unlock progress tracking.
          </p>
        )}
        <CourseLessonList
          lessons={course.lessons}
          variant={variant}
          canTrackProgress={canTrackProgress}
          showLessons={showLessons}
          onToggleLesson={onToggleLesson}
          isMutating={isMutating}
        />
      </CardContent>
      <CardFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="brand"
            size="sm"
            href={course.startUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            Start course
          </Button>
          {canTrackProgress && course.totalLessons > 0 && (
            <span className="text-xs text-muted-foreground">
              {progressValue}% complete
            </span>
          )}
        </div>
        {variant === "full" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end sm:self-auto"
            onClick={onToggleExpanded}
          >
            {isExpanded
              ? (
                <>
                  Hide outline
                  <ChevronUp className="ml-2 h-4 w-4" aria-hidden="true" />
                </>
              )
              : (
                <>
                  View outline
                  <ChevronDown className="ml-2 h-4 w-4" aria-hidden="true" />
                </>
              )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
