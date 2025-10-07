import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const DEFAULT_DOMAIN = "dynamiccapital.ton";
const JSON_HEADERS = { "content-type": "application/json" };

type ProposalRequest = {
  domain?: unknown;
  proposer?: unknown;
  newRecord?: unknown;
  quorum?: unknown;
};

type JsonObject = Record<string, unknown>;

type ProposalResponse = {
  ok: boolean;
  proposal?: JsonObject;
  message?: string;
};

function jsonResponse(payload: ProposalResponse, status: number) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function ensureObject(value: unknown, field: string): JsonObject | Error {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return new Error(`${field} must be an object`);
  }
  return value as JsonObject;
}

async function dispatchWebhook(payload: JsonObject) {
  const webhookUrl = Deno.env.get("DAO_WEBHOOK_URL");
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("dao-dns-proposal webhook error", error);
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  let body: ProposalRequest;
  try {
    body = await req.json();
  } catch (error) {
    console.error("dao-dns-proposal invalid json", error);
    return jsonResponse({ ok: false, message: "Invalid JSON payload" }, 400);
  }

  const proposer = typeof body.proposer === "string"
    ? body.proposer.trim()
    : "";
  if (!proposer) {
    return jsonResponse({ ok: false, message: "proposer is required" }, 400);
  }

  const domain = typeof body.domain === "string" && body.domain.trim()
    ? body.domain.trim().toLowerCase()
    : DEFAULT_DOMAIN;

  const record = ensureObject(body.newRecord, "newRecord");
  if (record instanceof Error) {
    return jsonResponse({ ok: false, message: record.message }, 400);
  }

  const proposedRecord: JsonObject = { ...record };
  if (!("domain" in proposedRecord)) {
    proposedRecord.domain = domain;
  }

  let quorumPercent = 60;
  if (typeof body.quorum === "number" && Number.isFinite(body.quorum)) {
    quorumPercent = body.quorum;
  } else if (typeof body.quorum === "string") {
    const parsed = Number(body.quorum);
    if (Number.isFinite(parsed)) {
      quorumPercent = parsed;
    }
  }
  quorumPercent = Math.min(Math.max(Math.round(quorumPercent), 1), 100);

  const supabase = createClient("service");

  const { data, error } = await supabase
    .from("dns_proposals")
    .insert({
      domain,
      proposer,
      proposed_record: proposedRecord,
      quorum: quorumPercent,
    })
    .select()
    .single();

  if (error) {
    console.error("dao-dns-proposal insert error", error);
    return jsonResponse({ ok: false, message: error.message }, 500);
  }

  await dispatchWebhook({
    title: "New DNS Proposal",
    domain,
    proposer,
    quorum: quorumPercent,
    proposal: data,
  });

  return jsonResponse({ ok: true, proposal: data as JsonObject }, 201);
});

export default handler;
