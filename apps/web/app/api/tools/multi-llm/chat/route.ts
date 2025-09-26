import { NextResponse } from "next/server";

import { executeChat } from "@/services/llm/providers";
import { chatRequestSchema } from "@/services/llm/schema";
import { type ChatRequest } from "@/services/llm/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message).join(
        "; ",
      );
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const payload = parsed.data as ChatRequest;
    const result = await executeChat(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
