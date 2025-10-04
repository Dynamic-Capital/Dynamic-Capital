import { z } from "zod";

import { type ChatRole, type ProviderId } from "./types";

export const chatRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
]) satisfies z.ZodType<ChatRole>;

const providerIdSchema = z.enum([
  "dynamic-ai",
  "dynamic-agi",
  "dynamic-ags",
  "openai",
  "anthropic",
  "groq",
  "llama-cpp",
  "vllm",
  "text-generation-inference",
]) satisfies z.ZodType<ProviderId>;

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1, "Message content cannot be empty"),
});

export const chatRequestSchema = z.object({
  providerId: providerIdSchema,
  messages: z.array(chatMessageSchema).min(
    1,
    "At least one message is required",
  ),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(32).max(8192).default(512),
  language: z.string().trim().min(2).max(32).optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
