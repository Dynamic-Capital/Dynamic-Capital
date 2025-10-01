import { createClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { corsHeaders, methodNotAllowed, ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

type LeadId = string;
type TemplateId = string | number;

interface LeadRow {
  id: LeadId;
  email: string;
  name: string | null;
  sequence_step: number | null;
  next_send_at: string;
  status: string;
}

interface TemplateRow {
  id: TemplateId;
  step: number;
  subject: string;
  body: string;
}

interface LogInsert {
  lead_id: LeadId;
  template_id: TemplateId;
  status: string;
  message_id: string | null;
  error: string | null;
}

interface LeadUpdate {
  sequence_step?: number | null;
  status?: string;
  next_send_at?: string | null;
  last_contacted?: string | null;
}

const supabase = createClient("service");
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_BATCH_SIZE = 5;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const STEP_DELAYS: Record<number, number> = { 1: 3 };
const DEFAULT_FOLLOW_UP_DELAY = 5;
const FALLBACK_FROM_EMAIL = "team@dynamiccapital.com";

const templateCache = new Map<number, TemplateRow | null>();

function resolveDelayDays(step: number): number {
  return STEP_DELAYS[step] ?? DEFAULT_FOLLOW_UP_DELAY;
}

function sanitizeName(raw: string | null | undefined): string {
  return raw?.trim() ?? "";
}

function renderTemplate(
  template: string,
  lead: LeadRow,
  nameFallback: string,
): string {
  const trimmedName = sanitizeName(lead.name);
  const replacements: Record<string, string> = {
    name: trimmedName || nameFallback,
    email: lead.email,
  };
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, token) => {
    const key = token.toLowerCase();
    if (key in replacements) {
      return replacements[key];
    }
    return match;
  });
}

async function getTemplate(step: number): Promise<TemplateRow | null> {
  if (templateCache.has(step)) {
    return templateCache.get(step) ?? null;
  }

  const { data, error } = await supabase
    .from<TemplateRow>("templates")
    .select("id, step, subject, body")
    .eq("step", step)
    .limit(1);

  if (error) {
    throw error;
  }

  const template = data?.[0] ?? null;
  templateCache.set(step, template);
  return template;
}

async function insertLog(entry: LogInsert): Promise<void> {
  const { error } = await supabase.from("logs").insert(entry);
  if (error) {
    console.error("drip-campaign: failed to insert log", error);
  }
}

async function updateLead(id: LeadId, patch: LeadUpdate): Promise<void> {
  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) {
    console.error("drip-campaign: failed to update lead", error);
  }
}

function buildSummary(
  lead: LeadRow,
  outcome: string,
  extra: Record<string, unknown> = {},
) {
  return {
    leadId: lead.id,
    outcome,
    step: lead.sequence_step ?? 1,
    ...extra,
  };
}

function serializeError(err: unknown): string {
  if (err === null || err === undefined) {
    return "";
  }
  if (err instanceof Error) {
    return JSON.stringify({ message: err.message, stack: err.stack });
  }
  if (typeof err === "object") {
    try {
      return JSON.stringify(err);
    } catch (_e) {
      return String(err);
    }
  }
  return String(err);
}

async function sendTemplate(
  lead: LeadRow,
  template: TemplateRow,
  apiKey: string,
  fromEmail: string,
): Promise<{ ok: boolean; messageId: string | null; error: unknown }> {
  const subject = renderTemplate(template.subject, lead, "");
  const html = renderTemplate(template.body, lead, "there");

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: lead.email,
        subject,
        html,
      }),
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (response.ok) {
      const messageId =
        payload && typeof payload === "object" && "id" in payload
          ? String((payload as { id: string }).id)
          : null;
      return { ok: true, messageId, error: null };
    }

    return { ok: false, messageId: null, error: payload ?? response.status };
  } catch (err) {
    return { ok: false, messageId: null, error: err };
  }
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return methodNotAllowed(req);
  }

  try {
    const { RESEND_API_KEY } = requireEnv(["RESEND_API_KEY"] as const);
    const fromEmail = optionalEnv("RESEND_FROM_EMAIL") ?? FALLBACK_FROM_EMAIL;

    const nowIso = new Date().toISOString();
    const { data: leads, error: leadError } = await supabase
      .from<LeadRow>("leads")
      .select("id, email, name, sequence_step, next_send_at, status")
      .in("status", ["READY", "SENT", "NEW", "PENDING"])
      .lte("next_send_at", nowIso)
      .order("next_send_at", { ascending: true })
      .limit(DEFAULT_BATCH_SIZE);

    if (leadError) {
      throw leadError;
    }

    if (!leads || leads.length === 0) {
      return ok({ message: "No leads ready" }, req);
    }

    const processed: Array<Record<string, unknown>> = [];

    for (const lead of leads) {
      const stepToSend = Math.max(lead.sequence_step ?? 1, 1);

      const recipient = typeof lead.email === "string" ? lead.email.trim() : "";

      if (!recipient) {
        await updateLead(lead.id, {
          status: "FAILED",
          next_send_at: null,
        });
        lead.sequence_step = stepToSend;
        processed.push(
          buildSummary(lead, "missing-email", {
            attemptedStep: stepToSend,
            error: "Missing email address",
          }),
        );
        continue;
      }

      lead.email = recipient;

      try {
        const template = await getTemplate(stepToSend);
        if (!template) {
          const contactTime = new Date();
          await updateLead(lead.id, {
            status: "COMPLETED",
            next_send_at: null,
            last_contacted: contactTime.toISOString(),
          });
          lead.sequence_step = stepToSend;
          processed.push(
            buildSummary(lead, "no-template", { attemptedStep: stepToSend }),
          );
          continue;
        }

        const contactTime = new Date();
        const contactIso = contactTime.toISOString();
        const sendResult = await sendTemplate(
          lead,
          template,
          RESEND_API_KEY,
          fromEmail,
        );

        await insertLog({
          lead_id: lead.id,
          template_id: template.id,
          status: sendResult.ok ? "SENT" : "FAILED",
          message_id: sendResult.messageId,
          error: sendResult.ok
            ? null
            : serializeError(sendResult.error) || null,
        });

        if (!sendResult.ok) {
          await updateLead(lead.id, {
            status: "FAILED",
            next_send_at: null,
            last_contacted: contactIso,
          });
          lead.sequence_step = stepToSend;
          processed.push(
            buildSummary(lead, "failed", {
              attemptedStep: stepToSend,
              error: serializeError(sendResult.error),
            }),
          );
          continue;
        }

        const delayDays = resolveDelayDays(stepToSend);
        const hasNextStep = (await getTemplate(stepToSend + 1)) !== null;
        const nextSendAt = hasNextStep
          ? new Date(contactTime.getTime() + delayDays * DAY_IN_MS)
            .toISOString()
          : null;

        await updateLead(lead.id, {
          sequence_step: hasNextStep ? stepToSend + 1 : stepToSend,
          status: hasNextStep ? "SENT" : "COMPLETED",
          next_send_at: nextSendAt,
          last_contacted: contactIso,
        });

        lead.sequence_step = hasNextStep ? stepToSend + 1 : stepToSend;

        processed.push(
          buildSummary(lead, hasNextStep ? "sent" : "completed", {
            attemptedStep: stepToSend,
            messageId: sendResult.messageId,
            nextSendAt,
          }),
        );
      } catch (err) {
        console.error("drip-campaign: error processing lead", lead.id, err);
        lead.sequence_step = stepToSend;
        processed.push(
          buildSummary(lead, "error", {
            attemptedStep: stepToSend,
            error: serializeError(err),
          }),
        );
      }
    }

    return ok({ processed }, req);
  } catch (err) {
    console.error("drip-campaign: execution error", err);
    return oops(
      "Drip campaign run failed",
      err instanceof Error ? err.message : String(err),
      req,
    );
  }
});

export default handler;
