"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  getSchoolCurriculum,
  SchoolCourse,
  setLessonCompletion,
} from "@/integrations/supabase/queries";
import { cn } from "@/utils";

import { CourseCard } from "./CourseCard";
import { SignInPromptCard } from "./SignInPromptCard";

interface SchoolCourseListProps {
  variant?: "full" | "compact";
  className?: string;
}

type LessonMutationVariables = {
  courseId: string;
  lessonId: string;
  completed: boolean;
};

export function SchoolCourseList(
  { variant = "full", className }: SchoolCourseListProps,
) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(
    new Set(),
  );

  const queryKey = useMemo(
    () => ["school-curriculum", user?.id ?? "anon", variant],
    [user?.id, variant],
  );

  const {
    data: courses,
    isLoading,
    isError,
    refetch,
  } = useQuery<SchoolCourse[]>({
    queryKey,
    queryFn: () => getSchoolCurriculum(user?.id ?? undefined),
    enabled: !loading,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (variant === "compact" && courses) {
      setExpandedCourses(new Set(courses.map((course) => course.id)));
    }
  }, [variant, courses]);

  const mutation = useMutation<void, Error, LessonMutationVariables>({
    mutationFn: ({ courseId, lessonId, completed }) => {
      if (!user) {
        throw new Error("You must be signed in to track progress.");
      }
      return setLessonCompletion({
        userId: user.id,
        courseId,
        lessonId,
        completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (mutationError) => {
      toast({
        title: "Unable to update progress",
        description: mutationError.message ?? "Please try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const canTrackProgress = Boolean(user);

  const handleToggleLesson = (
    courseId: string,
    lessonId: string,
    completed: boolean,
  ) => {
    if (mutation.isPending) return;
    mutation.mutate({ courseId, lessonId, completed });
  };

  const handleToggleExpanded = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const renderSkeleton = () => (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-xl border border-border/60 bg-background/50 p-6"
        >
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );

  return (
    <div className={cn("space-y-8", className)}>
      {variant === "full" && !canTrackProgress && !loading && (
        <SignInPromptCard />
      )}

      {loading || isLoading
        ? (
          renderSkeleton()
        )
        : isError
        ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
            <p className="font-medium">
              We couldn&apos;t load the curriculum right now.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-destructive underline-offset-4 hover:underline"
              onClick={() => refetch()}
            >
              Try again
            </button>
          </div>
        )
        : courses && courses.length > 0
        ? (
          <div className="grid gap-6">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                totalCourses={courses.length}
                variant={variant}
                isExpanded={expandedCourses.has(course.id)}
                onToggleExpanded={() => handleToggleExpanded(course.id)}
                canTrackProgress={canTrackProgress}
                onToggleLesson={(lessonId, nextCompleted) =>
                  handleToggleLesson(course.id, lessonId, nextCompleted)}
                isMutating={mutation.isPending}
              />
            ))}
          </div>
        )
        : (
          <div className="rounded-xl border border-border/60 bg-background/60 p-6 text-sm text-muted-foreground">
            Curriculum data is not available yet. Please check back soon for the
            latest course outline.
          </div>
        )}
    </div>
  );
}
