#!/usr/bin/env node

import process from "node:process";

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
  "  --dry-run              Print the request without sending it.\n" +
  "  --help                 Show this help message.\n";

type CliOptions = {
  projectId: string | null;
  webhookUrl: string | null;
  webhookToken: string | null;
  action: string;
  dryRun: boolean;
};

function parseArgs(argv: readonly string[]): CliOptions | null {
  const options: CliOptions = {
    projectId: null,
    webhookUrl: null,
    webhookToken: null,
    action: "close_minting",
    dryRun: false,
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
  return trimmed;
}

async function invokeWebhook(
  url: string,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    const message = text.trim() || `HTTP ${response.status}`;
    throw new Error(`Webhook responded with ${response.status}: ${message}`);
  }

  if (!text) {
    console.log("Webhook succeeded (empty response body).");
    return;
  }

  try {
    const payload = JSON.parse(text) as unknown;
    console.log("Webhook succeeded:", JSON.stringify(payload, null, 2));
  } catch {
    console.log("Webhook succeeded. Response:", text);
  }
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

  let webhookUrl: string;
  try {
    ({ url: webhookUrl } = resolveWebhookUrl(options));
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
  } satisfies Record<string, unknown>;

  if (options.dryRun) {
    console.log("Dry run enabled. Request preview:");
    console.log("POST", webhookUrl);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  try {
    await invokeWebhook(webhookUrl, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Webhook call failed:", message);
    process.exit(1);
  }
}

await main();
