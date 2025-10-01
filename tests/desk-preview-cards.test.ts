import test from "node:test";
import {
  deepStrictEqual as assertDeepStrictEqual,
  equal as assertEqual,
  rejects as assertRejects,
} from "node:assert/strict";

import {
  DEFAULT_DESK_PREVIEW_CARDS,
  fetchDeskPreviewCards,
} from "../apps/web/services/deskPreviewCards.ts";

const mockGradient = "linear-gradient(135deg, #000, #111)";

test("fetchDeskPreviewCards normalises Supabase payloads", async () => {
  const result = await fetchDeskPreviewCards({
    callEdge: async () => ({
      data: {
        contents: [
          {
            content_key: "desk_preview_cards",
            content_value: JSON.stringify([
              {
                title: "Live Signal Matrix",
                subtitle: "New catalyst queued",
                metric_label: "Playbook edge",
                metric_value: "+4.2%",
                description: "AUD/JPY momentum · 2 alerts firing",
                background: mockGradient,
              },
              {
                name: "Mentor Availability",
                subheading: "Next lab in 45m",
                metricLabel: "Seats left",
                metricValue: "2",
                body: "Reserve your slot before the room fills",
                gradient: mockGradient,
              },
            ]),
          },
        ],
      },
    }),
  });

  assertEqual(result.isFallback, false);
  assertEqual(result.cards.length, 2);
  assertDeepStrictEqual(result.cards[0], {
    title: "Live Signal Matrix",
    subtitle: "New catalyst queued",
    metricLabel: "Playbook edge",
    metricValue: "+4.2%",
    description: "AUD/JPY momentum · 2 alerts firing",
    gradient: mockGradient,
  });
  assertDeepStrictEqual(result.cards[1], {
    title: "Mentor Availability",
    subtitle: "Next lab in 45m",
    metricLabel: "Seats left",
    metricValue: "2",
    description: "Reserve your slot before the room fills",
    gradient: mockGradient,
  });
});

test("fetchDeskPreviewCards falls back to defaults when no content is returned", async () => {
  const result = await fetchDeskPreviewCards({
    callEdge: async () => ({
      data: {
        contents: [
          {
            content_key: "desk_preview_cards",
            content_value: JSON.stringify([]),
          },
        ],
      },
    }),
  });

  assertEqual(result.isFallback, true);
  assertDeepStrictEqual(result.cards, DEFAULT_DESK_PREVIEW_CARDS);
});

test("fetchDeskPreviewCards propagates Supabase errors", async () => {
  await assertRejects(
    () =>
      fetchDeskPreviewCards({
        callEdge: async () => ({
          error: { status: 500, message: "edge unavailable" },
        }),
      }),
    /edge unavailable/,
  );
});
