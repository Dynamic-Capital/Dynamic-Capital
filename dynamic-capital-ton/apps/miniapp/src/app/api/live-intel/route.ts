import { NextResponse } from "next/server";

import {
  DEFAULT_REFRESH_SECONDS,
  LIVE_INTEL_SNAPSHOTS,
  resolveSnapshotIndex,
  snapshotForTimestamp,
} from "@/data/live-intel";

function parseIndex(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

export function GET(req: Request) {
  const url = new URL(req.url);
  const indexParam = parseIndex(url.searchParams.get("index"));
  const now = new Date();

  let report;
  if (indexParam !== null) {
    const idx = resolveSnapshotIndex(indexParam, LIVE_INTEL_SNAPSHOTS.length);
    report = LIVE_INTEL_SNAPSHOTS[idx];
  } else {
    report = snapshotForTimestamp(now);
  }

  const cycleSeconds = DEFAULT_REFRESH_SECONDS;
  const secondsElapsed = Math.floor((now.getTime() / 1000) % cycleSeconds);
  const nextUpdateInSeconds = cycleSeconds - secondsElapsed;

  return NextResponse.json({
    generatedAt: now.toISOString(),
    nextUpdateInSeconds,
    report,
  });
}
