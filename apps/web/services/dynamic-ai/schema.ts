import { z } from "zod";

export const telegramAuthSchema = z.object({
  id: z.union([z.string(), z.number()]),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
});

export type TelegramAuthData = z.infer<typeof telegramAuthSchema>;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
  language: z.string().trim().min(2).max(32).optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatHistorySchema = z.array(chatMessageSchema);

export const chatRequestMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1),
  language: z.string().trim().min(2).max(32).optional(),
});

export type ChatRequestMessage = z.infer<typeof chatRequestMessageSchema>;

export const dynamicAiResponseSchema = z.object({
  answer: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type DynamicAiResponse = z.infer<typeof dynamicAiResponseSchema>;

export const chatRequestPayloadSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
  history: chatHistorySchema.max(50).default([]),
  telegram: telegramAuthSchema.optional(),
  language: z.string().trim().min(2).max(32).optional(),
});

export type ChatRequestPayload = z.infer<typeof chatRequestPayloadSchema>;
