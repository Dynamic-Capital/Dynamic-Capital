#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import process from "node:process";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 2;

const HELP_MESSAGE =
  `Usage: npx tsx scripts/ton/close-minting.ts [options]\n\n` +
  "Trigger the Ton Console webhook to close jetton minting for a project.\n" +
  "You must supply the project identifier and a webhook URL or token.\n\n" +
  "Options:\n" +
  "  --project <id>         Ton Console project identifier.\n" +
  "                        Defaults to TONCONSOLE_PROJECT_ID env var.\n" +
  "  --webhook-url <url>    Full webhook endpoint to invoke.\n" +
  "                        Defaults to TONCONSOLE_WEBHOOK_URL env var.\n" +
  "  --webhook-token <tok>  Token appended to https://tonconsole.com/api/webhook/.\n" +
  "                        Used when --webhook-url is omitted.\n" +
  "                        Defaults to TONCONSOLE_WEBHOOK_TOKEN env var.\n" +
  "  --action <name>        Webhook action name. Defaults to close_minting.\n" +
  "  --timeout <seconds>    Request timeout in seconds (default 15).\n" +
  "  --retries <count>      Retry attempts for transient failures (default 2).\n" +
  "  --dry-run              Print the request without sending it.\n" +
  "  --help                 Show this help message.\n";

type CliOptions = {
  projectId: string | null;
  webhookUrl: string | null;
  webhookToken: string | null;
  action: string;
  dryRun: boolean;
  timeoutMs: number;
  retries: number;
};

function parseArgs(argv: readonly string[]): CliOptions | null {
  const options: CliOptions = {
    projectId: null,
    webhookUrl: null,
    webhookToken: null,
    action: "close_minting",
    dryRun: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    retries: DEFAULT_RETRIES,
  };

  const args = [...argv];
  while (args.length > 0) {
    const flag = args.shift();
    if (!flag) break;

    switch (flag) {
      case "--help":
        return null;
      case "--project": {
        const value = args.shift();
        if (!value) {
          throw new Error("--project flag requires a value");
        }
        options.projectId = value;
        break;
      }
      case "--webhook-url": {
        const value = args.shift();
        if (!value) {
          throw new Error("--webhook-url flag requires a value");
        }
        options.webhookUrl = value;
        break;
      }
      case "--webhook-token": {
        const value = args.shift();
        if (!value) {
          throw new Error("--webhook-token flag requires a value");
        }
        options.webhookToken = value;
        break;
      }
      case "--action": {
        const value = args.shift();
        if (!value) {
          throw new Error("--action flag requires a value");
        }
        options.action = value;
        break;
      }
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--timeout": {
        const value = args.shift();
        if (!value) {
          throw new Error("--timeout flag requires a value in seconds");
        }
        const timeoutSeconds = Number.parseFloat(value);
        if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
          throw new Error("--timeout must be a positive number of seconds");
        }
        options.timeoutMs = Math.round(timeoutSeconds * 1000);
        break;
      }
      case "--retries": {
        const value = args.shift();
        if (!value) {
          throw new Error("--retries flag requires a numeric value");
        }
        const retries = Number.parseInt(value, 10);
        if (!Number.isFinite(retries) || retries < 0) {
          throw new Error("--retries must be a non-negative integer");
        }
        options.retries = retries;
        break;
      }
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }

  return options;
}

function resolveWebhookUrl(
  options: CliOptions,
): { url: string; derived: boolean } {
  if (options.webhookUrl) {
    return { url: options.webhookUrl, derived: false };
  }

  const explicitEnvUrl = process.env.TONCONSOLE_WEBHOOK_URL;
  if (explicitEnvUrl) {
    return { url: explicitEnvUrl, derived: false };
  }

  const token = options.webhookToken ?? process.env.TONCONSOLE_WEBHOOK_TOKEN;
  if (!token) {
    throw new Error(
      "Provide --webhook-url or --webhook-token (or set TONCONSOLE_WEBHOOK_URL / TONCONSOLE_WEBHOOK_TOKEN).",
    );
  }

  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new Error("Webhook token must not be empty");
  }

  const base = "https://tonconsole.com/api/webhook";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return { url: `${normalizedBase}/${normalizedToken}`, derived: true };
}

function resolveProjectId(options: CliOptions): string {
  const projectId = options.projectId ?? process.env.TONCONSOLE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "Provide --project <id> or set TONCONSOLE_PROJECT_ID in the environment.",
    );
  }
  const trimmed = projectId.trim();
  if (!trimmed) {
    throw new Error("Project identifier must not be empty");
  }
  if (!/^\d{6,}$/.test(trimmed)) {
    throw new Error(
      "Project identifier should be the numeric Ton Console project id",
    );
  }
  return trimmed;
}

function redactWebhook(url: string, derived: boolean): string {
  if (!derived) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
      return `${parsed.origin}/<token redacted>`;
    }
    parts[parts.length - 1] = "<token redacted>";
    parsed.pathname = `/${parts.join("/")}`;
    return parsed.toString();
  } catch {
    const index = url.lastIndexOf("/");
    if (index === -1) {
      return "<token redacted>";
    }
    return `${url.slice(0, index + 1)}<token redacted>`;
  }
}

function sanitizeAction(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) {
    throw new Error("Action name must not be empty");
  }
  if (!/^[a-z0-9_]+$/i.test(trimmed)) {
    throw new Error(
      "Action name must only contain letters, numbers, or underscores",
    );
  }
  return trimmed;
}

async function invokeWebhook(
  url: string,
  body: Record<string, unknown>,
  options: { timeoutMs: number; retries: number; redactedUrl: string },
): Promise<void> {
  let attempt = 0;
  let delayMs = 500;
  let lastError: unknown;

  while (attempt <= options.retries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      if (attempt === 0) {
        console.log(
          `Invoking Ton Console webhook at ${options.redactedUrl} (timeout ${options.timeoutMs}ms)`,
        );
      } else {
        console.warn(
          `Retrying Ton Console webhook (attempt ${attempt + 1} of ${
            options.retries + 1
          })...`,
        );
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        const message = text.trim() || `HTTP ${response.status}`;
        throw new Error(
          `Webhook responded with ${response.status}: ${message}`,
        );
      }

      if (!text) {
        console.log("Webhook succeeded (empty response body).");
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        try {
          const payload = JSON.parse(text) as unknown;
          console.log("Webhook succeeded:", JSON.stringify(payload, null, 2));
          return;
        } catch (error) {
          console.warn(
            `Unable to parse JSON response: ${
              (error as Error).message
            }. Falling back to raw text.`,
          );
        }
      }

      console.log("Webhook succeeded. Response:", text);
      return;
    } catch (error) {
      const isAbort = (error as { name?: string }).name === "AbortError";
      if (isAbort) {
        lastError = new Error(
          `Webhook request timed out after ${options.timeoutMs}ms`,
        );
      } else {
        lastError = error;
      }
    } finally {
      clearTimeout(timer);
    }

    attempt += 1;
    if (attempt > options.retries) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    delayMs = Math.min(delayMs * 2, 5_000);
  }

  const message = lastError instanceof Error
    ? lastError.message
    : String(lastError);
  throw new Error(`Failed to invoke Ton Console webhook: ${message}`);
}

async function main(): Promise<void> {
  let options: CliOptions | null;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error();
    console.error(HELP_MESSAGE);
    process.exit(1);
    return;
  }

  if (!options) {
    console.log(HELP_MESSAGE);
    return;
  }

  try {
    options.action = sanitizeAction(options.action);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error();
    console.error(HELP_MESSAGE);
    process.exit(1);
    return;
  }

  let webhookUrl: string;
  let redactedWebhookUrl: string;
  try {
    const resolved = resolveWebhookUrl(options);
    webhookUrl = resolved.url;
    redactedWebhookUrl = redactWebhook(resolved.url, resolved.derived);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error();
    console.error(HELP_MESSAGE);
    process.exit(1);
    return;
  }

  let projectId: string;
  try {
    projectId = resolveProjectId(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    console.error();
    console.error(HELP_MESSAGE);
    process.exit(1);
    return;
  }

  const payload = {
    action: options.action,
    projectId,
    requestedAt: new Date().toISOString(),
    requestId: randomUUID(),
  } satisfies Record<string, unknown>;

  if (options.dryRun) {
    console.log("Dry run enabled. Request preview:");
    console.log("POST", redactedWebhookUrl);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    await invokeWebhook(webhookUrl, payload, {
      timeoutMs: options.timeoutMs,
      retries: options.retries,
      redactedUrl: redactedWebhookUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Webhook call failed:", message);
    process.exit(1);
  }
}

await main();
