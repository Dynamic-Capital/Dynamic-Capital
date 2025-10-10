import { NextResponse } from "next/server";

import { getTonSourceConfiguration } from "@/services/ton-source";

const CACHE_CONTROL_HEADER =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export function GET() {
  const configuration = getTonSourceConfiguration();
  return NextResponse.json(configuration, {
    headers: { "Cache-Control": CACHE_CONTROL_HEADER },
  });
}
