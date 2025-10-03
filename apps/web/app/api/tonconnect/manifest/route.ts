import { NextResponse } from "next/server";

import { createTonManifest, resolveTonBaseUrl } from "@/config/ton";

const CACHE_HEADER =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";

export const dynamic = "force-dynamic";

export function GET() {
  const baseUrl = resolveTonBaseUrl();
  const manifest = createTonManifest(baseUrl);

  return NextResponse.json(manifest, {
    headers: {
      "Cache-Control": CACHE_HEADER,
    },
  });
}
