import { spawn as nodeSpawn } from "node:child_process";
import type {
  ChildProcessWithoutNullStreams,
  SpawnOptions,
} from "node:child_process";
import { TextDecoder } from "node:util";
import { z } from "zod";

import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  bad,
  corsHeaders,
  jsonResponse,
  methodNotAllowed,
  oops,
  unauth,
} from "@/utils/http.ts";
import {
  type AdminVerificationFailure,
  isAdminVerificationFailure,
  verifyAdminRequest,
} from "@/utils/admin-auth.ts";

const ROUTE_NAME = "/api/dynamic-cli";
const CLI_MODULE = "dynamic.intelligence.agi.build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SPAWN_OVERRIDE_SYMBOL = Symbol.for(
  "dynamic-capital.dynamic-cli.spawn-override",
);

type SpawnFunction = (
  command: string,
  args?: readonly string[],
  options?: SpawnOptions,
) => ChildProcessWithoutNullStreams;

function resolveSpawn(): SpawnFunction {
  const override = (globalThis as Record<PropertyKey, unknown>)[
    SPAWN_OVERRIDE_SYMBOL
  ];
  if (override) {
    return override as SpawnFunction;
  }
  return nodeSpawn;
}

const nodeSchema = z.object({
  key: z.string().min(1, "Node key is required."),
  title: z.string().min(1, "Node title is required."),
  description: z.string().optional(),
  weight: z.number().finite().optional(),
  minimum_maturity: z.number().finite().optional(),
  target_maturity: z.number().finite().optional(),
  dependencies: z.array(z.string().min(1)).optional(),
  practices: z.array(z.string().min(1)).optional(),
}).passthrough();

const pulseSchema = z.object({
  node: z.string().min(1, "Pulse node is required."),
  maturity: z.number().finite(),
  confidence: z.number().finite().optional(),
  enablement: z.number().finite().optional(),
  resilience: z.number().finite().optional(),
  momentum: z.number().finite().optional(),
  timestamp: z.union([
    z.string().min(1),
    z.number().finite(),
  ]),
  tags: z.array(z.string().min(1)).optional(),
  narrative: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
}).passthrough();

const scenarioSchema = z.object({
  history: z.number().int().min(1).optional(),
  decay: z.number().min(0).lt(1).optional(),
  nodes: z.array(nodeSchema).min(1, "Provide at least one node."),
  pulses: z.array(pulseSchema).min(1, "Provide at least one pulse."),
}).passthrough();

const requestSchema = z.object({
  scenario: scenarioSchema,
  format: z.enum(["text", "json", "fine-tune"]).default("text"),
  indent: z.number().int().min(-1).max(8).default(2),
  fineTuneTags: z.array(z.string().min(1).max(64)).max(16).default([]),
  exportDataset: z.boolean().default(false),
});

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function executeCli(
  payload: z.infer<typeof requestSchema>,
): Promise<CliResult> {
  const pythonBinary = process.env.DYNAMIC_AGI_PYTHON ??
    process.env.DYNAMIC_CLI_PYTHON ??
    process.env.PYTHON ??
    "python3";

  const args: string[] = [
    "-m",
    CLI_MODULE,
    "--format",
    payload.format,
  ];

  if (typeof payload.indent === "number") {
    args.push("--indent", String(payload.indent));
  }

  if (payload.exportDataset || payload.format === "fine-tune") {
    args.push("--dataset", "-");
  }

  for (const tag of payload.fineTuneTags) {
    args.push("--fine-tune-tag", tag);
  }

  const shouldSendScenario = Boolean(payload.scenario);
  if (shouldSendScenario) {
    args.push("--scenario", "-");
  }

  const spawn = resolveSpawn();
  const child = spawn(pythonBinary, args, {
    env: process.env,
  });

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const decoder = new TextDecoder();

  child.stdout.setEncoding?.("utf-8");
  child.stderr.setEncoding?.("utf-8");

  child.stdout.on("data", (chunk: Buffer | string) => {
    const piece = typeof chunk === "string" ? chunk : decoder.decode(chunk);
    stdoutChunks.push(piece);
  });

  child.stderr.on("data", (chunk: Buffer | string) => {
    const piece = typeof chunk === "string" ? chunk : decoder.decode(chunk);
    stderrChunks.push(piece);
  });

  const stdin = child.stdin;
  if (!stdin) {
    child.kill();
    throw new Error("Dynamic CLI process did not expose stdin.");
  }

  if (shouldSendScenario) {
    stdin.setDefaultEncoding?.("utf-8");
    stdin.write(`${JSON.stringify(payload.scenario)}\n`);
  }
  stdin.end();

  return await new Promise<CliResult>((resolve, reject) => {
    child.once("error", (error) => {
      reject(error);
    });

    child.once("close", (code: number | null) => {
      resolve({
        stdout: stdoutChunks.join(""),
        stderr: stderrChunks.join(""),
        exitCode: code ?? 0,
      });
    });
  });
}

function normaliseOutput(
  payload: z.infer<typeof requestSchema>,
  stdout: string,
): {
  report: string;
  dataset?: Record<string, unknown>;
} {
  if (payload.format === "fine-tune") {
    const trimmed = stdout.trim();
    const dataset = JSON.parse(trimmed) as Record<string, unknown>;
    return {
      report: trimmed,
      dataset,
    };
  }

  if (payload.exportDataset) {
    const trimmed = stdout.trimEnd();
    const separator = "\n\n";
    const separatorIndex = trimmed.lastIndexOf(separator);
    if (separatorIndex !== -1) {
      const report = trimmed.slice(0, separatorIndex);
      const datasetText = trimmed.slice(separatorIndex + separator.length)
        .trim();
      if (!datasetText) {
        throw new Error("Dynamic CLI did not return a dataset payload.");
      }
      const dataset = JSON.parse(datasetText) as Record<string, unknown>;
      return { report, dataset };
    }
  }

  return { report: stdout.trimEnd() };
}

function handleAdminFailure(
  result: AdminVerificationFailure,
  req: Request,
) {
  if (result.status >= 500) {
    return oops(result.message, undefined, req);
  }
  return unauth(result.message, req);
}

export async function POST(req: Request) {
  return await withApiMetrics(req, ROUTE_NAME, async () => {
    const adminCheck = await verifyAdminRequest(req);
    if (isAdminVerificationFailure(adminCheck)) {
      return handleAdminFailure(adminCheck, req);
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return bad("Request body must be valid JSON.", undefined, req);
    }

    const parsed = requestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return bad("Invalid Dynamic CLI payload.", parsed.error.format(), req);
    }

    const payload = parsed.data;

    try {
      const { stdout, stderr, exitCode } = await executeCli(payload);

      if (exitCode !== 0) {
        const message = stderr.trim() || "Dynamic CLI execution failed.";
        const status = exitCode === 2 ? 400 : 500;
        return jsonResponse({ ok: false, error: message }, { status }, req);
      }

      const { report, dataset } = normaliseOutput(payload, stdout);

      return jsonResponse({
        report,
        reportFormat: payload.format,
        ...(dataset ? { dataset } : {}),
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Dynamic CLI request failed.";
      return oops(message, undefined, req);
    }
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "POST");
  return new Response(null, { status: 204, headers });
}
