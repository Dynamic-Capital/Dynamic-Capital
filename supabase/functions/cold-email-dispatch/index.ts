import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { createLogger } from "../_shared/logger.ts";
import { corsHeaders, json, mna, oops } from "../_shared/http.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";

type LeadStatus = "new" | "processing" | "sent" | "error" | string;

type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  status: LeadStatus;
  last_contacted: string | null;
  metadata?: Record<string, unknown> | null;
};

type TemplateRow = {
  id: string;
  subject: string;
  body: string;
  variables: string[] | null;
  is_active?: boolean | null;
};

type EventRow = {
  id?: string;
  lead_id: string;
  template_id: string;
  message_id: string | null;
  status: "sent" | "error" | string;
  error: string | null;
  sent_at: string;
};

type DispatchResult = {
  leadId: string;
  email: string;
  templateId: string | null;
  status: "sent" | "skipped" | "error";
  messageId?: string;
  error?: string;
};

const { RESEND_API_KEY, COLD_EMAIL_FROM_ADDRESS } = requireEnv(
  [
    "RESEND_API_KEY",
    "COLD_EMAIL_FROM_ADDRESS",
  ] as const,
);

const FROM_NAME = optionalEnv("COLD_EMAIL_FROM_NAME");
const REPLY_TO = optionalEnv("COLD_EMAIL_REPLY_TO");

const rawBatchSize = optionalEnv("COLD_EMAIL_MAX_BATCH");
const BATCH_SIZE = (() => {
  const parsed = rawBatchSize ? Number.parseInt(rawBatchSize, 10) : 5;
  if (Number.isNaN(parsed)) return 5;
  return Math.min(Math.max(parsed, 1), 50);
})();

const supabase = createClient("service");
const logger = createLogger({ function: "cold-email-dispatch" });

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function buildFromAddress(): string {
  if (FROM_NAME) {
    return `${FROM_NAME} <${COLD_EMAIL_FROM_ADDRESS}>`;
  }
  return COLD_EMAIL_FROM_ADDRESS;
}

function normaliseVariables(vars: string[] | null | undefined): string[] {
  if (!vars) return [];
  return vars
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function pickRandomTemplate(templates: TemplateRow[]): TemplateRow | null {
  if (!templates.length) return null;
  const index = Math.floor(Math.random() * templates.length);
  return templates[index] ?? null;
}

function collectMergeFields(lead: LeadRow): Record<string, string> {
  const fields: Record<string, string> = {};
  if (lead.name) fields.name = lead.name;
  if (lead.email) fields.email = lead.email;
  if (lead.company) fields.company = lead.company;
  if (lead.metadata && typeof lead.metadata === "object") {
    for (const [key, value] of Object.entries(lead.metadata)) {
      if (value == null) continue;
      if (typeof value === "string" || typeof value === "number") {
        fields[key] = String(value);
      }
    }
  }
  if (lead.last_contacted) fields.last_contacted = lead.last_contacted;
  return fields;
}

function applyTemplate(
  template: TemplateRow,
  lead: LeadRow,
): { subject: string; html: string; missing: string[] } {
  const variables = normaliseVariables(template.variables);
  const replacements = collectMergeFields(lead);

  const missing = variables.filter((variable) => !(variable in replacements));

  const substitute = (input: string): string =>
    input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
      const value = replacements[key];
      return value ?? "";
    });

  return {
    subject: substitute(template.subject ?? ""),
    html: substitute(template.body ?? ""),
    missing,
  };
}

async function claimPendingLeads(): Promise<LeadRow[]> {
  const { data, error } = await supabase.rpc<LeadRow[]>(
    "claim_cold_email_leads",
    { batch_size: BATCH_SIZE },
  );

  if (error) {
    throw new Error(`Failed to claim leads: ${error.message}`);
  }

  return data ?? [];
}

async function fetchActiveTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from<TemplateRow>("cold_email_templates")
    .select("id, subject, body, variables, is_active")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load templates: ${error.message}`);
  }

  return data ?? [];
}

async function markLeadStatus(
  leadId: string,
  status: LeadStatus,
  options: { lastContacted?: string | null } = {},
) {
  const update: Partial<Pick<LeadRow, "status" | "last_contacted">> = {
    status,
  };
  if (Object.prototype.hasOwnProperty.call(options, "lastContacted")) {
    update.last_contacted = options.lastContacted ?? null;
  }

  const { error } = await supabase
    .from<LeadRow>("cold_email_leads")
    .update(update)
    .eq("id", leadId);

  if (error) {
    logger.error("Failed to update lead status", { leadId, status, error });
  }
}

async function recordEvent(event: EventRow) {
  const { error } = await supabase
    .from<EventRow>("cold_email_events")
    .insert(event);

  if (error) {
    logger.error("Failed to insert email event", { event, error });
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ id: string | null }> {
  const payload: Record<string, unknown> = {
    from: buildFromAddress(),
    to,
    subject,
    html,
  };

  if (REPLY_TO) payload.reply_to = REPLY_TO;

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Resend API error (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  const json = (await response.json()) as { id?: string | null };
  return { id: json.id ?? null };
}

async function processLead(
  lead: LeadRow,
  templates: TemplateRow[],
): Promise<DispatchResult> {
  const template = pickRandomTemplate(templates);
  if (!template) {
    return {
      leadId: lead.id,
      email: lead.email,
      templateId: null,
      status: "skipped",
      error: "No active templates configured",
    };
  }

  const nowIso = () => new Date().toISOString();

  if (!lead.email) {
    const message = "Lead missing email address";
    const occurredAt = nowIso();
    logger.warn(message, { leadId: lead.id });
    await markLeadStatus(lead.id, "error", { lastContacted: occurredAt });
    await recordEvent({
      lead_id: lead.id,
      template_id: template.id,
      message_id: null,
      status: "error",
      error: message,
      sent_at: occurredAt,
    });
    return {
      leadId: lead.id,
      email: lead.email,
      templateId: template.id,
      status: "error",
      error: message,
    };
  }

  const compiled = applyTemplate(template, lead);
  if (compiled.missing.length > 0) {
    const missingList = compiled.missing.join(", ");
    const occurredAt = nowIso();
    logger.warn("Missing merge variables", {
      leadId: lead.id,
      templateId: template.id,
      missing: missingList,
    });
    await markLeadStatus(lead.id, "error", { lastContacted: occurredAt });
    await recordEvent({
      lead_id: lead.id,
      template_id: template.id,
      message_id: null,
      status: "error",
      error: `Missing template variables: ${missingList}`,
      sent_at: occurredAt,
    });
    return {
      leadId: lead.id,
      email: lead.email,
      templateId: template.id,
      status: "error",
      error: `Missing template variables: ${missingList}`,
    };
  }

  try {
    const { id: messageId } = await sendEmail(
      lead.email,
      compiled.subject,
      compiled.html,
    );

    const completedAt = nowIso();
    await markLeadStatus(lead.id, "sent", { lastContacted: completedAt });
    await recordEvent({
      lead_id: lead.id,
      template_id: template.id,
      message_id: messageId,
      status: "sent",
      error: null,
      sent_at: completedAt,
    });

    return {
      leadId: lead.id,
      email: lead.email,
      templateId: template.id,
      status: "sent",
      messageId: messageId ?? undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failedAt = nowIso();
    logger.error("Failed to send cold email", {
      leadId: lead.id,
      templateId: template.id,
      error: message,
    });
    await markLeadStatus(lead.id, "error", { lastContacted: failedAt });
    await recordEvent({
      lead_id: lead.id,
      template_id: template.id,
      message_id: null,
      status: "error",
      error: message,
      sent_at: failedAt,
    });
    return {
      leadId: lead.id,
      email: lead.email,
      templateId: template.id,
      status: "error",
      error: message,
    };
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders(req, "POST,OPTIONS"),
      },
    });
  }

  if (req.method !== "POST") {
    return mna();
  }

  const start = Date.now();

  try {
    const templates = await fetchActiveTemplates();
    if (!templates.length) {
      return json(
        {
          ok: false,
          dispatched: 0,
          error: "No active templates available",
        },
        400,
        {},
        req,
      );
    }

    const leads = await claimPendingLeads();
    if (!leads.length) {
      return json(
        {
          ok: true,
          dispatched: 0,
          message: 'No pending leads with status="new"',
        },
        200,
        {},
        req,
      );
    }

    const results: DispatchResult[] = [];
    for (const lead of leads) {
      const result = await processLead(lead, templates);
      results.push(result);
    }

    const durationMs = Date.now() - start;
    const sentCount = results.filter((r) => r.status === "sent").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return json(
      {
        ok: errorCount === 0,
        claimed: leads.length,
        dispatched: sentCount,
        skipped: skippedCount,
        errors: errorCount,
        durationMs,
        results,
      },
      200,
      {},
      req,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Unhandled cold email dispatch error", { error: message });
    return oops(message, undefined, req);
  }
}

serve(handler);

export { handler };
export type { DispatchResult, EventRow, LeadRow, TemplateRow };
