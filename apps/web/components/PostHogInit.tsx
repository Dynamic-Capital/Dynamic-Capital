"use client";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function PostHogInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ||
          "https://app.posthog.com",
      });
    }
  }, []);
  return null;
}
