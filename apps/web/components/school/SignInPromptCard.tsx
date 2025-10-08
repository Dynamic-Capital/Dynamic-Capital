"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/utils";

interface SignInPromptCardProps {
  className?: string;
}

export function SignInPromptCard({ className }: SignInPromptCardProps) {
  return (
    <Card
      className={cn("border-dashed border-primary/40 bg-primary/5", className)}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-primary">
          Track your progress
        </CardTitle>
        <CardDescription className="text-sm">
          Sign in to unlock lesson tracking, progress meters, and completion
          badges as you work through the School of Pipsology.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We will save your lesson completions to your profile so you can pick
          up exactly where you left off.
        </p>
        <Button variant="brand" href="/login">
          Unlock tracking
        </Button>
      </CardContent>
    </Card>
  );
}
