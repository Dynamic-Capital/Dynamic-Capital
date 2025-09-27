export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ProviderSummary {
  id: ProviderId;
  name: string;
  description: string;
  configured: boolean;
  defaultModel: string;
  contextWindow: number;
  maxOutputTokens: number;
}

export type ProviderId = "openai" | "anthropic" | "groq";

export interface PromptTemplate {
  id: string;
  label: string;
  description: string;
  providerSuitability: ProviderId[];
  prompt: string;
}

export interface ChatRequest {
  providerId: ProviderId;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  provider: ProviderSummary;
  message: ChatMessage;
  usage?: TokenUsage;
  rawResponse?: unknown;
}
