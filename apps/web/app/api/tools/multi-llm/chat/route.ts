import { NextResponse } from "next/server";

import { executeChat } from "@/services/llm/providers";
import { chatRequestSchema } from "@/services/llm/schema";
import { type ChatRequest } from "@/services/llm/types";
import {
  type AdminVerificationFailure,
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "@/utils/admin-auth.ts";
import { oops, unauth } from "@/utils/http.ts";

export const dynamic = "force-dynamic";

const EXECUTE_CHAT_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.multi-llm.execute-chat",
);

type ExecuteChatFn = (payload: ChatRequest) => Promise<unknown>;

function getExecuteChat(): ExecuteChatFn {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    EXECUTE_CHAT_OVERRIDE_SYMBOL
  ];
  if (typeof override === "function") {
    return override as ExecuteChatFn;
  }
  return executeChat;
}

function handleAdminFailure(result: AdminVerificationFailure, req: Request) {
  if (result.status >= 500) {
    return oops(result.message, undefined, req);
  }
  return unauth(result.message, req);
}

export async function POST(request: Request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (isAdminVerificationFailure(adminCheck)) {
      return handleAdminFailure(adminCheck, request);
    }

    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => issue.message).join(
        "; ",
      );
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const payload = parsed.data as ChatRequest;
    const execute = getExecuteChat();
    const result = await execute(payload);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
