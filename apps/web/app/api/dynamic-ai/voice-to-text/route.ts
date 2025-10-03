import { getServerSession } from "next-auth";

import { authOptions } from "@/auth/options";
import { withApiMetrics } from "@/observability/server-metrics.ts";
import { isDynamicAiVoiceToTextConfigured } from "@/config/dynamic-ai";
import { callDynamicAiVoiceToText } from "@/services/dynamic-ai/voice-to-text";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
  unauth,
} from "@/utils/http.ts";
import {
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "@/utils/admin-auth.ts";

const ROUTE_NAME = "/api/dynamic-ai/voice-to-text";

export const runtime = "nodejs";

const SESSION_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-ai.session",
);

type SessionLike =
  | { user?: { id?: string | null } | null }
  | null
  | undefined;

type SessionResolver = () => SessionLike | Promise<SessionLike>;

async function resolveSession(): Promise<SessionLike> {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    SESSION_OVERRIDE_SYMBOL
  ];
  if (typeof override === "function") {
    return await (override as SessionResolver)();
  }
  return await getServerSession(authOptions);
}

interface AuthSuccess {
  ok: true;
}

interface AuthFailure {
  ok: false;
  status: number;
  message: string;
}

type AuthResult = AuthSuccess | AuthFailure;

async function requireAuthentication(req: Request): Promise<AuthResult> {
  const session = await resolveSession();
  if (session?.user) {
    return { ok: true } satisfies AuthSuccess;
  }

  const adminCheck = await verifyAdminRequest(req);
  if (!isAdminVerificationFailure(adminCheck)) {
    return { ok: true } satisfies AuthSuccess;
  }

  return {
    ok: false,
    status: adminCheck.status,
    message: adminCheck.message,
  } satisfies AuthFailure;
}

function handleAuthFailure(result: AuthFailure, req: Request) {
  if (result.status >= 500) {
    return oops(result.message, undefined, req);
  }
  return unauth(
    result.status === 401 ? "Authentication required." : result.message,
    req,
  );
}

function resolveFile(formData: FormData): File | null {
  const candidates = [
    formData.get("file"),
    formData.get("audio"),
    formData.get("voice"),
  ];

  for (const candidate of candidates) {
    if (candidate instanceof File) {
      return candidate;
    }
  }

  return null;
}

export async function POST(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    if (!isDynamicAiVoiceToTextConfigured) {
      return oops("Dynamic AI voice-to-text is not configured", undefined, req);
    }

    const authResult = await requireAuthentication(req);
    if (authResult.ok === false) {
      return handleAuthFailure(authResult, req);
    }

    const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return bad("Expected multipart/form-data with an audio file", req);
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      console.warn("Failed to parse multipart payload", error);
      return bad("Invalid multipart payload", req);
    }

    const file = resolveFile(formData);
    if (!file) {
      return bad("Provide an audio file under the 'file' field", req);
    }

    const promptValue = formData.get("prompt");
    const modelValue = formData.get("model");
    const responseFormatValue = formData.get("response_format");
    const temperatureValue = formData.get("temperature");
    const languageValue = formData.get("language");

    const prompt = typeof promptValue === "string"
      ? promptValue.trim()
      : undefined;
    const model = typeof modelValue === "string"
      ? modelValue.trim()
      : undefined;
    const responseFormat = typeof responseFormatValue === "string"
      ? responseFormatValue.trim()
      : undefined;

    let parsedTemperature: number | undefined;
    if (typeof temperatureValue === "string" && temperatureValue.trim()) {
      const value = Number.parseFloat(temperatureValue);
      parsedTemperature = Number.isFinite(value) ? value : undefined;
    }

    const language = typeof languageValue === "string"
      ? languageValue.trim()
      : undefined;

    try {
      const transcription = await callDynamicAiVoiceToText({
        file,
        fileName: file.name,
        prompt,
        model,
        responseFormat,
        temperature: parsedTemperature,
        language,
      });

      return jsonResponse(
        {
          ok: true,
          transcript: transcription.text,
          language: transcription.language ?? null,
          segments: transcription.segments ?? null,
          durationMs: transcription.duration_ms ?? null,
          metadata: {
            model: transcription.model,
            temperature: transcription.temperature,
            ...(transcription.metadata ?? {}),
          },
        },
        {},
        req,
      );
    } catch (error) {
      console.error("Dynamic AI voice-to-text failed", error);
      const message = error instanceof Error
        ? error.message
        : "Dynamic AI voice-to-text failed";
      return oops(message, error, req);
    }
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = (req: Request) => methodNotAllowed(req);

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}
