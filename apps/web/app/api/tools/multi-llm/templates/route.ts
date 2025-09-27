import { NextResponse } from "next/server";

import { listPromptTemplates } from "@/services/llm/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = listPromptTemplates();
  return NextResponse.json({ templates });
}
