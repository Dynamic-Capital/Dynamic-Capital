import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";
import {
  createHttpClientWithEnvCa,
  type HttpClientContext,
} from "../_shared/tls.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const DEFAULT_SOURCE_URL = "https://dynamiccapital.ton/dns-records.json";
const DEFAULT_DOMAIN = "dynamiccapital.ton";

type VerifyRequest = {
  domain?: unknown;
  sourceUrl?: unknown;
};

type VerifyResponse = {
  ok: boolean;
  message?: string;
  verification?: {
    domain: string;
    proposalId?: string;
    executedAt?: string;
    sourceUrl: string;
    matches: boolean;
    differences?: string[];
  };
};

function jsonResponse(payload: VerifyResponse, status: number) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function parseOptionalString(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
}

function normalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalise(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, normalise(val)]);
    return Object.fromEntries(entries);
  }
  return value;
}

function collectDifferences(
  expected: unknown,
  actual: unknown,
  path = "",
  output: string[] = [],
): string[] {
  if (typeof expected !== typeof actual) {
    output.push(`${path || "root"}: type mismatch`);
    return output;
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let i = 0; i < length; i += 1) {
      collectDifferences(expected[i], actual[i], `${path}[${i}]`, output);
    }
    return output;
  }

  if (
    expected && typeof expected === "object" &&
    actual && typeof actual === "object"
  ) {
    const expectedEntries = Object.entries(expected as Record<string, unknown>);
    const actualEntries = Object.entries(actual as Record<string, unknown>);
    const keys = new Set([
      ...expectedEntries.map(([key]) => key),
      ...actualEntries.map(([key]) => key),
    ]);
    for (const key of keys) {
      collectDifferences(
        (expected as Record<string, unknown>)[key],
        (actual as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
        output,
      );
    }
    return output;
  }

  if (expected !== actual) {
    output.push(
      `${path || "root"}: expected ${JSON.stringify(expected)}, got ${
        JSON.stringify(actual)
      }`,
    );
  }
  return output;
}

export const handler = registerHandler(async (req) => {
  let tlsContext: HttpClientContext | null = null;

  let body: VerifyRequest | null = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch (error) {
      console.error("dns-verify invalid json", error);
      return jsonResponse({ ok: false, message: "Invalid JSON payload" }, 400);
    }
  }

  const domain = parseOptionalString(body?.domain, DEFAULT_DOMAIN);
  const sourceUrl = parseOptionalString(body?.sourceUrl, DEFAULT_SOURCE_URL);

  const supabase = createClient("service");

  const { data: proposal, error: proposalError } = await supabase
    .from("dns_proposals")
    .select("id, proposed_record, executed, executed_at")
    .eq("domain", domain)
    .eq("executed", true)
    .order("executed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (proposalError) {
    console.error("dns-verify proposal fetch error", proposalError);
    return jsonResponse({ ok: false, message: proposalError.message }, 500);
  }

  if (!proposal) {
    return jsonResponse({
      ok: true,
      verification: {
        domain,
        proposalId: undefined,
        executedAt: undefined,
        sourceUrl,
        matches: false,
        differences: ["No executed proposals found"],
      },
    }, 200);
  }

  const expectedRecord = normalise(proposal.proposed_record);

  let remoteRecord: unknown;
  try {
    tlsContext = await createHttpClientWithEnvCa();
    const response = await fetch(sourceUrl, {
      headers: { accept: "application/json" },
      client: tlsContext?.client,
    });
    if (!response.ok) {
      return jsonResponse({
        ok: false,
        message: `Failed to fetch DNS record (${response.status})`,
      }, 502);
    }
    remoteRecord = await response.json();
  } catch (error) {
    console.error("dns-verify fetch error", error);
    return jsonResponse(
      { ok: false, message: "Failed to fetch DNS record" },
      502,
    );
  } finally {
    tlsContext?.client.close();
  }

  const actualRecord = normalise(remoteRecord);
  const differences = collectDifferences(expectedRecord, actualRecord);
  const matches = differences.length === 0;

  return jsonResponse({
    ok: matches,
    verification: {
      domain,
      proposalId: proposal.id as string,
      executedAt: proposal.executed_at as string | undefined,
      sourceUrl,
      matches,
      differences: matches ? undefined : differences,
    },
  }, matches ? 200 : 409);
});

export default handler;
