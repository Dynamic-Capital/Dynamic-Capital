import { getEnvVar } from "@/utils/env.ts";

export const OPENAI_API_URL = "https://api.openai.com/v1";

export interface OpenAIClientOptions {
  apiKey?: string;
  apiBaseUrl?: string;
}

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_schema"; json_schema: unknown } | {
    type: "text";
  };
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export class OpenAIClient {
  readonly apiKey?: string;
  readonly baseUrl: string;

  constructor(options: OpenAIClientOptions = {}) {
    this.apiKey = options.apiKey ?? getEnvVar("OPENAI_API_KEY");
    const base = options.apiBaseUrl ?? getEnvVar("OPENAI_BASE_URL") ??
      OPENAI_API_URL;
    this.baseUrl = base.replace(/\/$/, "");
  }

  private async request<T>(path: string, payload: unknown): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OpenAI request failed: ${res.status} ${error}`);
    }
    return (await res.json()) as T;
  }

  createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    return this.request<ChatCompletionResponse>("/chat/completions", request);
  }
}
