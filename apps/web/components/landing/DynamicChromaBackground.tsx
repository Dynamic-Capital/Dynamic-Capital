"use client";

import dynamic from "next/dynamic";

import type { ChromaBackgroundProps } from "@/components/landing/ChromaBackground";

export const DynamicChromaBackground = dynamic<ChromaBackgroundProps>(
  () => import("@/components/landing/ChromaBackground"),
  { ssr: false }
);
