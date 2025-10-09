import { NextResponse } from "next/server";

import { tokenJettonMetadata } from "@/resources";

const CACHE_CONTROL_HEADER =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=86400";

export const dynamic = "force-static";
export const revalidate = 300;

export function GET() {
  return NextResponse.json(tokenJettonMetadata, {
    headers: { "Cache-Control": CACHE_CONTROL_HEADER },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    headers: { "Cache-Control": CACHE_CONTROL_HEADER },
  });
}
