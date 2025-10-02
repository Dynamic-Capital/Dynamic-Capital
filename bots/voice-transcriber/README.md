# Dynamic Capital Voice Transcriber Bot

This bot mirrors the workflow popularized by
[nikandr-surkov/telegram-bot-ai-voice-to-text](https://github.com/nikandr-surkov/telegram-bot-ai-voice-to-text)
but is tailored for the Dynamic Capital stack. It listens for Telegram voice
notes, audio messages, and video notes, forwards the media to OpenAI for
transcription, and replies with the transcript inside the originating chat.

## Features

- Handles `voice`, `audio`, and `video_note` updates in private chats or groups.
- Supports optional prompts via captions or text replies to improve accuracy
  (for example, providing speaker names or jargon).
- Streams progress updates: the bot acknowledges the request immediately and
  edits the placeholder message once transcription is complete.
- Automatically chunks long transcripts to respect Telegram's 4096 character
  limit.
- Provides `/start`, `/help`, and `/model` commands for quick onboarding and
  diagnostics.
- Gracefully shuts down on `SIGINT`/`SIGTERM` to support containerized
  deployments.

## Prerequisites

| Variable                                      | Description                                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`                          | Bot token from [@BotFather](https://t.me/BotFather).                                            |
| `OPENAI_API_KEY`                              | API key for the transcription model.                                                            |
| `OPENAI_TRANSCRIPTION_MODEL` (optional)       | Defaults to `gpt-4o-mini-transcribe`. Override if you prefer `whisper-1` or a custom fine-tune. |
| `OPENAI_TRANSCRIPTION_TEMPERATURE` (optional) | Float between `0` and `1`. Defaults to `0` for deterministic transcripts.                       |
| `OPENAI_BASE_URL` (optional)                  | Custom API URL for on-prem or proxy deployments.                                                |

You can place these values in an `.env` file and load them with a process
manager like `npm-run-all`, `dotenv-cli`, or `foreman`.

## Installation

The workspace already includes the required dependencies (`grammy` and
`openai`). If you are adding this bot to a fresh checkout, make sure to run:

```bash
npm install
```

## Running Locally

```bash
TELEGRAM_BOT_TOKEN=your_token \
OPENAI_API_KEY=your_openai_key \
OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe \
npx tsx bots/voice-transcriber/index.ts
```

> 💡 If you do not need model customization, omit the optional environment
> variables.

The bot logs its startup status and announces the Telegram username it is
authenticated as. Send any supported media to the bot and it will respond with
the transcription.

## Deployment Notes

- The bot uses long polling by default. To deploy behind a webhook, wrap the
  `Bot` instance with `webhookCallback` from `grammy` and wire the handler into
  your hosting platform.
- Container orchestrators (Docker, Kubernetes, Fly.io, etc.) should propagate
  `SIGINT`/`SIGTERM` to allow the bot to shut down gracefully.
- For strict access control, add guard clauses before the transcription step to
  allow only specific chat IDs or user IDs.

## Extending the Bot

Ideas inspired by the reference implementation:

- Cache transcripts in Redis or Supabase for analytics.
- Send both raw transcripts and LLM-generated summaries.
- Add language detection and dynamic prompt engineering to increase accuracy.
- Offer `/export` to email a `.txt` or `.srt` file of the conversation.

Feel free to iterate on top of this foundation to match your production
requirements.
