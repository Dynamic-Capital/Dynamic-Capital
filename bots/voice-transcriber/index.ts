import { Bot, GrammyError, HttpError } from "grammy";
import type { Message, MessageEntity } from "grammy/types";
import OpenAI from "openai";

interface VoiceTranscriberConfig {
  telegramBotToken: string;
  openAiApiKey: string;
  openAiModel: string;
  openAiBaseUrl?: string;
  temperature: number;
}

type TranscribableMessage =
  | Message.VoiceMessage
  | Message.AudioMessage
  | Message.VideoNoteMessage
  | Message.DocumentMessage;

interface TranscriptionContext {
  message: TranscribableMessage;
  prompt?: string;
}

const AUDIO_VIDEO_EXTENSIONS = [
  ".aac",
  ".amr",
  ".flac",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".oga",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadConfig(): VoiceTranscriberConfig {
  const temperature = Number.parseFloat(
    process.env.OPENAI_TRANSCRIPTION_TEMPERATURE ?? "0",
  );
  return {
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    openAiApiKey: requireEnv("OPENAI_API_KEY"),
    openAiModel: process.env.OPENAI_TRANSCRIPTION_MODEL ??
      "gpt-4o-mini-transcribe",
    openAiBaseUrl: process.env.OPENAI_BASE_URL,
    temperature: Number.isFinite(temperature) ? temperature : 0,
  } satisfies VoiceTranscriberConfig;
}

const TELEGRAM_FILE_BASE_URL = "https://api.telegram.org/file";
const config = loadConfig();
const bot = new Bot(config.telegramBotToken);
const openai = new OpenAI({
  apiKey: config.openAiApiKey,
  baseURL: config.openAiBaseUrl,
});

async function fetchTelegramFile(
  botToken: string,
  fileId: string,
): Promise<
  { buffer: ArrayBuffer; fileName: string; mimeType?: string } | null
> {
  const file = await bot.api.getFile(fileId);
  if (!file.file_path) {
    return null;
  }

  const fileUrl = `${TELEGRAM_FILE_BASE_URL}/bot${botToken}/${file.file_path}`;
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to download Telegram file: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const fileName = file.file_path.split("/").pop() ?? `${fileId}.ogg`;

  return {
    buffer,
    fileName,
    mimeType: response.headers.get("content-type") ?? undefined,
  };
}

async function transcribeAudio(
  openai: OpenAI,
  config: VoiceTranscriberConfig,
  context: TranscriptionContext,
): Promise<string> {
  const fileId = getFileId(context.message);
  const download = await fetchTelegramFile(config.telegramBotToken, fileId);

  if (!download) {
    throw new Error("Unable to fetch Telegram file metadata");
  }

  const fileBlob = new File([download.buffer], download.fileName, {
    type: download.mimeType ?? guessMimeType(context.message),
  });

  const transcription = await openai.audio.transcriptions.create({
    model: config.openAiModel,
    file: fileBlob,
    temperature: config.temperature,
    prompt: context.prompt,
  });

  if (!("text" in transcription) || !transcription.text) {
    throw new Error("Received empty transcription response");
  }

  return transcription.text.trim();
}

function guessMimeType(
  message: TranscribableMessage,
): string {
  if (message.voice?.mime_type) return message.voice.mime_type;
  if (message.audio?.mime_type) return message.audio.mime_type;
  if (message.video_note?.mime_type) return message.video_note.mime_type;
  if (message.document?.mime_type) return message.document.mime_type;

  const inferredFromName = inferMimeTypeFromFileName(
    message.document?.file_name,
  );
  if (inferredFromName) return inferredFromName;
  return "audio/ogg";
}

function getFileId(
  message: TranscribableMessage,
): string {
  if (message.voice) return message.voice.file_id;
  if (message.audio) return message.audio.file_id;
  if (message.video_note) return message.video_note.file_id;
  if (message.document) return message.document.file_id;
  throw new Error("Message does not contain a supported audio payload");
}

function extractTranscriptionPrompt(message: Message): string | undefined {
  if (message.caption) {
    return message.caption;
  }

  if ("text" in message && typeof message.text === "string") {
    const trimmed = message.text.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  const reply = message.reply_to_message;
  if (reply && "caption" in reply && typeof reply.caption === "string") {
    const trimmedCaption = reply.caption.trim();
    if (trimmedCaption.length > 0) {
      return trimmedCaption;
    }
  }

  if (reply && "text" in reply && typeof reply.text === "string") {
    const trimmed = reply.text.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return undefined;
}

function isBotCommandMessage(message: Message): boolean {
  const hasCommandEntity = (entities?: MessageEntity[]): boolean => {
    return Boolean(
      entities?.some((entity) =>
        entity.type === "bot_command" && entity.offset === 0
      ),
    );
  };

  const entities = "entities" in message ? message.entities : undefined;
  const captionEntities = "caption_entities" in message
    ? message.caption_entities
    : undefined;

  return hasCommandEntity(entities) || hasCommandEntity(captionEntities);
}

function isTranscribableDocument(message: Message.DocumentMessage): boolean {
  const mimeType = message.document.mime_type?.toLowerCase();
  if (mimeType?.startsWith("audio/") || mimeType?.startsWith("video/")) {
    return true;
  }

  const fileName = message.document.file_name?.toLowerCase();
  return Boolean(
    fileName &&
      AUDIO_VIDEO_EXTENSIONS.some((extension) => fileName.endsWith(extension)),
  );
}

function isTranscribableMessage(
  message: Message,
): message is TranscribableMessage {
  if (message.voice || message.audio || message.video_note) return true;
  if (message.document) {
    return isTranscribableDocument(message as Message.DocumentMessage);
  }
  return false;
}

function inferMimeTypeFromFileName(
  fileName?: string,
): string | undefined {
  if (!fileName) return undefined;
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".amr")) return "audio/amr";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".oga") || lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mkv")) return "video/x-matroska";
  return undefined;
}

bot.catch((error) => {
  if (error.error instanceof GrammyError) {
    console.error("Telegram API error", error.error.description);
    return;
  }

  if (error.error instanceof HttpError) {
    console.error("Network error while accessing Telegram", error.error);
    return;
  }

  console.error("Unexpected bot error", error.error);
});

bot.command("start", async (ctx) => {
  await ctx.reply(
    [
      "👋 Welcome to the Dynamic Capital voice transcriber!",
      "Send me a voice note, audio file, or video note and I will return the transcript.",
      "You can include a caption with additional context or keywords to guide the transcription.",
    ].join("\n\n"),
  );
});

bot.command("help", async (ctx) => {
  await ctx.reply(
    [
      "📖 Voice transcription bot",
      "- Send audio, voice, or video notes to receive a transcription.",
      "- Add a caption to specify speaker names, topics, or spelling hints.",
      "- Use /model to check which transcription model is active.",
    ].join("\n"),
  );
});

bot.command("model", async (ctx) => {
  await ctx.reply(
    `🧠 Transcriptions currently use ${config.openAiModel} with temperature ${config.temperature}.`,
  );
});

bot.on(
  ["message:voice", "message:audio", "message:video_note", "message:document"],
  async (ctx) => {
    if (!ctx.message) return;

    if (ctx.message.document && !isTranscribableDocument(ctx.message)) {
      await ctx.reply(
        "I can transcribe audio or video documents only (mp3, m4a, wav, ogg, opus, webm, mp4).",
      );
      return;
    }

    if (!isTranscribableMessage(ctx.message)) {
      return;
    }

    const workingMessage = await ctx.reply("📝 Transcribing your message...");

    try {
      if (ctx.chat?.id) {
        await ctx.api.sendChatAction(ctx.chat.id, "typing");
      }
      const prompt = extractTranscriptionPrompt(ctx.message);
      const transcript = await transcribeAudio(openai, config, {
        message: ctx.message,
        prompt,
      });

      const responseLines = [
        "✅ Transcription complete!",
        transcript,
      ];

      if (prompt) {
        responseLines.push("", "Context provided:", prompt);
      }

      const chunks = chunkText(responseLines.join("\n\n"), 3800);
      await ctx.api.editMessageText(
        workingMessage.chat.id,
        workingMessage.message_id,
        chunks[0],
      );

      for (let index = 1; index < chunks.length; index += 1) {
        await ctx.reply(chunks[index]);
      }
    } catch (error) {
      console.error("Failed to transcribe audio", error);
      await ctx.api.editMessageText(
        workingMessage.chat.id,
        workingMessage.message_id,
        "❌ I couldn't transcribe that audio. Please try again or send a shorter clip.",
      );
    }
  },
);

function chunkText(text: string, limit: number): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > limit) {
    let sliceEnd = remaining.lastIndexOf("\n\n", limit);
    if (sliceEnd <= 0) {
      sliceEnd = remaining.lastIndexOf("\n", limit);
    }
    if (sliceEnd <= 0) {
      sliceEnd = limit;
    }

    const chunk = remaining.slice(0, sliceEnd).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    remaining = remaining.slice(sliceEnd).trimStart();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

bot.on("message", async (ctx) => {
  if (!ctx.message) return;
  if (isBotCommandMessage(ctx.message)) return;
  if (isTranscribableMessage(ctx.message)) return;

  await ctx.reply(
    "I can process voice notes, audio files, video notes, or audio/video documents (mp3, m4a, wav, ogg, webm, mp4). Try sending one of those!",
  );
});

async function startBot(): Promise<void> {
  console.log(
    "Starting voice transcription bot with model",
    config.openAiModel,
  );
  await bot.api.setMyCommands([
    { command: "start", description: "Set up the transcriber" },
    { command: "help", description: "How to use the bot" },
    { command: "model", description: "Show the active transcription model" },
  ]);

  await bot.start({
    onStart(botInfo) {
      console.log(
        `Bot @${botInfo.username} is ready to transcribe voice messages.`,
      );
    },
  });
}

// Graceful shutdown support
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    console.log(`Received ${signal}, stopping bot...`);
    void bot.stop();
  });
}

void startBot();
