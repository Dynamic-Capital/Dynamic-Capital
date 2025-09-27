import { z } from "zod";

import { type ChatRole, type ProviderId } from "./types";

export const chatRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
]) satisfies z.ZodType<ChatRole>;

const providerIdSchema = z.enum([
  "openai",
  "anthropic",
  "groq",
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
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export const promptTemplateSchema = z.object({
  id: z.string().min(1, "Template id is required"),
  label: z.string().min(1, "Template label is required"),
  description: z.string().min(1, "Template description is required"),
  providerSuitability: z.array(providerIdSchema).default([]),
  prompt: z.string().min(1, "Template prompt cannot be empty"),
});
