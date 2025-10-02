import { z } from "zod";

import {
  DYNAMIC_AI_VOICE_TO_TEXT_KEY,
  DYNAMIC_AI_VOICE_TO_TEXT_MODEL,
  DYNAMIC_AI_VOICE_TO_TEXT_TEMPERATURE,
  DYNAMIC_AI_VOICE_TO_TEXT_TIMEOUT_MS,
  DYNAMIC_AI_VOICE_TO_TEXT_URL,
} from "@/config/dynamic-ai";

const DYNAMIC_AI_FETCH_OVERRIDE = Symbol.for(
  "dynamic-capital.dynamic-ai.fetch-override",
);

function getFetch(): typeof fetch {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    DYNAMIC_AI_FETCH_OVERRIDE
  ];
  if (typeof override === "function") {
    return override as typeof fetch;
  }
  return fetch;
}

export const dynamicAiTranscriptionSchema = z.object({
  text: z.string().min(1),
  language: z.string().optional(),
  duration_ms: z.number().nonnegative().optional(),
  segments: z
    .array(
      z.object({
        text: z.string().min(1),
        start: z.number().nonnegative().optional(),
        end: z.number().nonnegative().optional(),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type DynamicAiTranscription = z.infer<
  typeof dynamicAiTranscriptionSchema
>;

export interface DynamicAiVoiceToTextParams {
  file: Blob;
  fileName?: string;
  prompt?: string;
  model?: string;
  responseFormat?: string;
  temperature?: number;
  language?: string;
  signal?: AbortSignal;
}

export interface DynamicAiVoiceToTextResult extends DynamicAiTranscription {
  model: string;
  temperature: number;
}

export async function callDynamicAiVoiceToText({
  file,
  fileName,
  prompt,
  model,
  responseFormat,
  temperature,
  language,
  signal,
}: DynamicAiVoiceToTextParams): Promise<DynamicAiVoiceToTextResult> {
  if (!DYNAMIC_AI_VOICE_TO_TEXT_URL || !DYNAMIC_AI_VOICE_TO_TEXT_KEY) {
    throw new Error("Dynamic AI voice-to-text is not configured");
  }

  if (file.size === 0) {
    throw new Error("Audio file is empty");
  }

  const selectedModel = model?.trim() || DYNAMIC_AI_VOICE_TO_TEXT_MODEL;
  const parsedTemperature = Number.isFinite(temperature)
    ? (temperature as number)
    : DYNAMIC_AI_VOICE_TO_TEXT_TEMPERATURE;

  const formData = new FormData();
  formData.append("file", file, fileName ?? "audio.webm");
  formData.append("model", selectedModel);

  if (prompt?.trim()) {
    formData.append("prompt", prompt.trim());
  }

  if (typeof parsedTemperature === "number") {
    formData.append("temperature", String(parsedTemperature));
  }

  if (responseFormat?.trim()) {
    formData.append("response_format", responseFormat.trim());
  }

  if (language?.trim()) {
    formData.append("language", language.trim());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DYNAMIC_AI_VOICE_TO_TEXT_TIMEOUT_MS,
  );

  try {
    const response = await getFetch()(DYNAMIC_AI_VOICE_TO_TEXT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${DYNAMIC_AI_VOICE_TO_TEXT_KEY}`,
      },
      body: formData,
      signal: signal ?? controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Dynamic AI voice-to-text failed with status ${response.status} ${response.statusText}`,
      );
    }

    const payload = await response.json();
    const transcription = dynamicAiTranscriptionSchema.parse(payload);
    return {
      ...transcription,
      model: selectedModel,
      temperature: parsedTemperature,
    } satisfies DynamicAiVoiceToTextResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
