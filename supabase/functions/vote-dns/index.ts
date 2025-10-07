import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const JSON_HEADERS = { "content-type": "application/json" };

type VoteRequest = {
  proposalId?: unknown;
  voter?: unknown;
  support?: unknown;
};

type VoteResponse = {
  ok: boolean;
  message?: string;
  proposal?: Record<string, unknown>;
  tally?: {
    votes_for: number;
    votes_against: number;
  };
};

function jsonResponse(payload: VoteResponse, status: number) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: JSON_HEADERS,
  });
}

function parseSupport(value: unknown): boolean | Error {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (["yes", "true", "approve", "for", "1"].includes(normalised)) {
      return true;
    }
    if (["no", "false", "reject", "against", "0"].includes(normalised)) {
      return false;
    }
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return new Error("support must be a boolean");
}

function parseProposalId(value: unknown): string | Error {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return new Error("proposalId is required");
}

function parseVoter(value: unknown): string | Error {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return new Error("voter is required");
}

function sumWeights(records: Array<{ support: boolean; weight: number }>) {
  return records.reduce(
    (acc, item) => {
      if (item.support) {
        acc.votes_for += Number(item.weight) || 0;
      } else {
        acc.votes_against += Number(item.weight) || 0;
      }
      return acc;
    },
    { votes_for: 0, votes_against: 0 },
  );
}

export const handler = registerHandler(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed" }, 405);
  }

  let body: VoteRequest;
  try {
    body = await req.json();
  } catch (error) {
    console.error("vote-dns invalid json", error);
    return jsonResponse({ ok: false, message: "Invalid JSON payload" }, 400);
  }

  const proposalId = parseProposalId(body.proposalId);
  if (proposalId instanceof Error) {
    return jsonResponse({ ok: false, message: proposalId.message }, 400);
  }

  const voter = parseVoter(body.voter);
  if (voter instanceof Error) {
    return jsonResponse({ ok: false, message: voter.message }, 400);
  }

  const support = parseSupport(body.support);
  if (support instanceof Error) {
    return jsonResponse({ ok: false, message: support.message }, 400);
  }

  const supabase = createClient("service");

  const { data: proposal, error: proposalError } = await supabase
    .from("dns_proposals")
    .select("id, executed")
    .eq("id", proposalId)
    .single();

  if (proposalError) {
    if (proposalError.code === "PGRST116") {
      return jsonResponse({ ok: false, message: "Proposal not found" }, 404);
    }
    console.error("vote-dns proposal fetch error", proposalError);
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

  const { data: member, error: memberError } = await supabase
    .from("dao_members")
    .select("wallet, voting_power, active")
    .eq("wallet", voter)
    .single();

  if (memberError) {
    if (memberError.code === "PGRST116") {
      return jsonResponse(
        { ok: false, message: "Voter is not registered" },
        403,
      );
    }
    console.error("vote-dns member fetch error", memberError);
    return jsonResponse({ ok: false, message: memberError.message }, 500);
  }

  if (!member?.active) {
    return jsonResponse({ ok: false, message: "Voter is inactive" }, 403);
  }

  const weight = Number(member.voting_power ?? 0);
  if (!Number.isFinite(weight) || weight <= 0) {
    return jsonResponse(
      { ok: false, message: "Voter has no voting power" },
      403,
    );
  }

  const { error: voteError } = await supabase
    .from("dns_proposal_votes")
    .upsert({
      proposal_id: proposalId,
      voter,
      support,
      weight,
    }, { onConflict: "proposal_id,voter" });

  if (voteError) {
    console.error("vote-dns upsert error", voteError);
    return jsonResponse({ ok: false, message: voteError.message }, 500);
  }

  const { data: votes, error: votesError } = await supabase
    .from("dns_proposal_votes")
    .select("support, weight")
    .eq("proposal_id", proposalId);

  if (votesError) {
    console.error("vote-dns tally error", votesError);
    return jsonResponse({ ok: false, message: votesError.message }, 500);
  }

  const tally = sumWeights(votes ?? []);

  const { data: updatedProposal, error: updateError } = await supabase
    .from("dns_proposals")
    .update({
      votes_for: tally.votes_for,
      votes_against: tally.votes_against,
      updated_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (updateError) {
    console.error("vote-dns proposal update error", updateError);
    return jsonResponse({ ok: false, message: updateError.message }, 500);
  }

  return jsonResponse({
    ok: true,
    proposal: updatedProposal ?? undefined,
    tally,
  }, 200);
});

export default handler;
