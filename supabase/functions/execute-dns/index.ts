import { encode as encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const DEFAULT_QUORUM = 60;

type ExecuteRequest = {
  proposalId?: unknown;
  txHash?: unknown;
  executor?: unknown;
};

type ExecuteResponse = {
  ok: boolean;
  message?: string;
  proposal?: Record<string, unknown>;
  execution?: {
    quorumPercent: number;
    approvalPercent: number;
    totalVotingPower: number;
    votesFor: number;
  };
};

function jsonResponse(payload: ExecuteResponse, status: number) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function parseString(
  value: unknown,
  field: string,
  required = true,
): string | Error {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (!required && (value === undefined || value === null)) {
    return "";
  }
  return new Error(`${field} is required`);
}

function calculatePercent(votesFor: number, total: number): number {
  if (total <= 0) return 0;
  return (votesFor / total) * 100;
}

async function sendExecutionWebhook(payload: Record<string, unknown>) {
  const webhookUrl = Deno.env.get("DAO_EXECUTION_WEBHOOK_URL");
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("execute-dns webhook error", error);
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  let body: ExecuteRequest;
  try {
    body = await req.json();
  } catch (error) {
    console.error("execute-dns invalid json", error);
    return jsonResponse({ ok: false, message: "Invalid JSON payload" }, 400);
  }

  const proposalId = parseString(body.proposalId, "proposalId");
  if (proposalId instanceof Error) {
    return jsonResponse({ ok: false, message: proposalId.message }, 400);
  }

  const txHash = parseString(body.txHash, "txHash", false);
  if (txHash instanceof Error) {
    return jsonResponse({ ok: false, message: txHash.message }, 400);
  }

  const executor = parseString(body.executor, "executor", false);
  if (executor instanceof Error) {
    return jsonResponse({ ok: false, message: executor.message }, 400);
  }

  const supabase = createClient("service");

  const { data: proposal, error: proposalError } = await supabase
    .from("dns_proposals")
    .select("id, domain, proposed_record, votes_for, quorum, executed")
    .eq("id", proposalId)
    .single();

  if (proposalError) {
    if (proposalError.code === "PGRST116") {
      return jsonResponse({ ok: false, message: "Proposal not found" }, 404);
    }
    console.error("execute-dns proposal fetch error", proposalError);
    return jsonResponse({ ok: false, message: proposalError.message }, 500);
  }

  if (!proposal) {
    return jsonResponse({ ok: false, message: "Proposal not found" }, 404);
  }

  if (proposal.executed) {
    return jsonResponse(
      { ok: false, message: "Proposal already executed" },
      409,
    );
  }

  const { data: members, error: membersError } = await supabase
    .from("dao_members")
    .select("voting_power")
    .eq("active", true);

  if (membersError) {
    console.error("execute-dns members fetch error", membersError);
    return jsonResponse({ ok: false, message: membersError.message }, 500);
  }

  const totalVotingPower = (members ?? []).reduce((acc, member) => {
    const weight = Number(member.voting_power ?? 0);
    if (Number.isFinite(weight) && weight > 0) {
      return acc + weight;
    }
    return acc;
  }, 0);

  if (totalVotingPower <= 0) {
    return jsonResponse({
      ok: false,
      message: "No active voting power available",
    }, 409);
  }

  const votesFor = Number(proposal.votes_for ?? 0);
  const quorumPercent = Number(proposal.quorum ?? DEFAULT_QUORUM);
  const approvalPercent = calculatePercent(votesFor, totalVotingPower);

  if (approvalPercent < quorumPercent) {
    return jsonResponse({
      ok: false,
      message: "Quorum not met",
      execution: {
        quorumPercent,
        approvalPercent,
        totalVotingPower,
        votesFor,
      },
    }, 409);
  }

  const recordValue = proposal.proposed_record;
  if (
    !recordValue || typeof recordValue !== "object" ||
    Array.isArray(recordValue)
  ) {
    return jsonResponse(
      { ok: false, message: "Proposal record is invalid" },
      500,
    );
  }

  const record = recordValue as Record<string, unknown>;
  const recordJson = JSON.stringify(record);
  const recordBase64 = encodeBase64(new TextEncoder().encode(recordJson));

  await sendExecutionWebhook({
    type: "dns-execute",
    proposalId,
    domain: proposal.domain,
    executor,
    txHash,
    record,
    record_base64: recordBase64,
  });

  const { data: updatedProposal, error: updateError } = await supabase
    .from("dns_proposals")
    .update({
      executed: true,
      executed_at: new Date().toISOString(),
      onchain_tx: txHash || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (updateError) {
    console.error("execute-dns update error", updateError);
    return jsonResponse({ ok: false, message: updateError.message }, 500);
  }

  return jsonResponse({
    ok: true,
    proposal: updatedProposal ?? undefined,
    execution: {
      quorumPercent,
      approvalPercent,
      totalVotingPower,
      votesFor,
    },
  }, 200);
});

export default handler;
