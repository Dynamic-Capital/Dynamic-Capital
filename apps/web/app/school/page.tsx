"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SchoolCourseList } from "@/components/school/SchoolCourseList";
import { useAuth } from "@/hooks/useAuth";

export default function SchoolPage() {
  const { user, loading } = useAuth();
  const firstName = (user?.user_metadata as { first_name?: string } | undefined)
    ?.first_name;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12 sm:px-8 lg:px-12">
      <header className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.4em] text-primary/80">
            School of Pipsology
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Your guided path from forex novice to confident trader
          </h1>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Work through eleven structured courses that introduce the foreign
            exchange market, build technical fluency, and install the habits
            professional traders rely on every day.
          </p>
        </div>
        {!loading && !user && (
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="brand" size="lg">
              <Link href="/login">Sign in to track your lessons</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="#curriculum">Preview the curriculum</a>
            </Button>
          </div>
        )}
        {!loading && user && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            {firstName ? `Welcome back, ${firstName}!` : "Welcome back!"}{" "}
            Keep building momentum by completing your next lesson.
          </div>
        )}
      </header>
      <section id="curriculum">
        <SchoolCourseList />
      </section>
    </div>
  );
}
