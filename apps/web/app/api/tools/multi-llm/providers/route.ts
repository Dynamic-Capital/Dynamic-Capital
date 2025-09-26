import { NextResponse } from "next/server";

import { listProviders } from "@/services/llm/providers";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = listProviders();
  return NextResponse.json({ providers });
}
