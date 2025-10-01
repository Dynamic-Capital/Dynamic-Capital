import test from "node:test";
import {
  deepStrictEqual as assertDeepStrictEqual,
  equal as assertEqual,
  rejects as assertRejects,
} from "node:assert/strict";

import {
  DEFAULT_DESK_ONBOARDING_STEPS,
  fetchDeskOnboardingSteps,
} from "../apps/web/services/deskOnboardingSteps.ts";

test("fetchDeskOnboardingSteps normalises Supabase payloads", async () => {
  const result = await fetchDeskOnboardingSteps({
    callEdge: async () => ({
      data: {
        contents: [
          {
            content_key: "desk_onboarding_steps",
            content_value: JSON.stringify([
              {
                id: "calibrate",
                title: "Calibrate my plan",
                iconName: "sparkles",
                description: "Answer quick prompts to tailor alerts.",
                bullets: [
                  "Pick your risk ceiling",
                  "Select favourite markets",
                ],
                action: { label: "Start intake", href: "/intake" },
              },
              {
                slug: "drill",
                label: "Drill with mentors",
                icon: "calendar",
                summary: "Join the next rehearsal window.",
                highlights: ["Book a live lab"],
                cta: { title: "See lab schedule", url: "/labs" },
              },
            ]),
          },
        ],
      },
    }),
  });

  assertEqual(result.isFallback, false);
  assertEqual(result.steps.length, 2);
  assertDeepStrictEqual(result.steps[0], {
    id: "calibrate",
    label: "Calibrate my plan",
    icon: "sparkles",
    summary: "Answer quick prompts to tailor alerts.",
    highlights: ["Pick your risk ceiling", "Select favourite markets"],
    actionLabel: "Start intake",
    actionHref: "/intake",
  });
  assertDeepStrictEqual(result.steps[1], {
    id: "drill",
    label: "Drill with mentors",
    icon: "calendar",
    summary: "Join the next rehearsal window.",
    highlights: ["Book a live lab"],
    actionLabel: "See lab schedule",
    actionHref: "/labs",
  });
});

test("fetchDeskOnboardingSteps falls back to defaults when payload is missing", async () => {
  const result = await fetchDeskOnboardingSteps({
    callEdge: async () => ({
      data: { contents: [] },
    }),
  });

  assertEqual(result.isFallback, true);
  assertDeepStrictEqual(result.steps, DEFAULT_DESK_ONBOARDING_STEPS);
});

test("fetchDeskOnboardingSteps propagates Supabase errors", async () => {
  await assertRejects(
    () =>
      fetchDeskOnboardingSteps({
        callEdge: async () => ({
          error: { status: 503, message: "temporarily unavailable" },
        }),
      }),
    /temporarily unavailable/,
  );
});
