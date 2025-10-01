import { getServiceClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { mna, ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

interface LeadRecord {
  id: string;
  email: string;
  full_name?: string | null;
  sequence_key?: string | null;
  status?: string | null;
  current_step?: number | null;
  max_steps?: number | null;
  cadence_hours?: number | null;
  last_sent_at?: string | null;
  next_send_at?: string | null;
  replied_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface TemplateRecord {
  id: string;
  sequence_key: string;
  step: number;
  subject: string;
  body: string;
  delay_hours?: number | null;
  metadata?: Record<string, unknown> | null;
}

interface SendSummary {
  processed: number;
  sent: number;
  completed: number;
  skipped: number;
  errors: Array<{ leadId: string; reason: string }>;
}

const DEFAULT_BATCH_LIMIT = 50;
const DEFAULT_DELAY_HOURS = 24;
const SENDABLE_STATUSES = ["active", "open", "scheduled"] as const;

function sanitizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

function firstName(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[0];
}

function renderBody(template: TemplateRecord, lead: LeadRecord): string {
  const replacements = new Map<string, string>([
    ["{{email}}", lead.email],
    ["{{name}}", lead.full_name?.trim() || lead.email],
    ["{{first_name}}", firstName(lead.full_name)?.trim() || lead.email],
  ]);

  let output = template.body;
  for (const [token, value] of replacements.entries()) {
    const safeValue = value ?? "";
    output = output.replaceAll(token, safeValue);
    output = output.replaceAll(token.toUpperCase(), safeValue);
  }
  return output;
}

function toHtml(body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  if (paragraphs.length === 0) {
    return `<p>${body.replaceAll("\n", "<br />")}</p>`;
  }
  return paragraphs
    .map((segment) => {
      const lines = segment.replaceAll("\n", "<br />");
      return `<p>${lines}</p>`;
    })
    .join("\n");
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function loadTemplate(
  sequence: string,
  step: number,
  cache: Map<string, TemplateRecord | null>,
): Promise<TemplateRecord | null> {
  const key = `${sequence}:${step}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("crm_drip_templates")
    .select("id,sequence_key,step,subject,body,delay_hours,metadata")
    .eq("sequence_key", sequence)
    .eq("step", step)
    .maybeSingle<TemplateRecord>();
  if (error) {
    console.error(
      "[drip] Failed to load template",
      sequence,
      step,
      error.message,
    );
    cache.set(key, null);
    return null;
  }
  cache.set(key, data ?? null);
  return data ?? null;
}

function computeNextSendAt(
  lead: LeadRecord,
  template: TemplateRecord,
  now: Date,
): string | null {
  const cadence = sanitizeNumber(lead.cadence_hours, DEFAULT_DELAY_HOURS);
  const templateDelay = sanitizeNumber(
    template.delay_hours ?? cadence,
    cadence,
  );
  const hours = Math.max(templateDelay, 1);
  const next = new Date(now.getTime() + hours * 60 * 60 * 1000);
  return next.toISOString();
}

function buildMetadata(
  lead: LeadRecord,
  template: TemplateRecord,
  nextStep: number,
  sentAtIso: string,
): Record<string, unknown> {
  const meta = normalizeMetadata(lead.metadata);
  meta.last_sent_template = {
    ...(typeof meta.last_sent_template === "object" &&
        meta.last_sent_template !== null
      ? meta.last_sent_template
      : {}),
    template_id: template.id,
    sequence: template.sequence_key,
    step: nextStep,
    sent_at: sentAtIso,
  };
  return meta;
}

async function sendEmail(
  lead: LeadRecord,
  template: TemplateRecord,
  body: string,
): Promise<{ ok: true } | { ok: false; status?: number; reason: string }> {
  const { RESEND_API_KEY, CRM_DRIP_FROM_EMAIL } = requireEnv(
    [
      "RESEND_API_KEY",
      "CRM_DRIP_FROM_EMAIL",
    ] as const,
  );
  const fromName = optionalEnv("CRM_DRIP_FROM_NAME");
  const sender = fromName
    ? `${fromName} <${CRM_DRIP_FROM_EMAIL}>`
    : CRM_DRIP_FROM_EMAIL;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [lead.email],
      subject: template.subject,
      text: body,
      html: toHtml(body),
      tags: [
        { name: "sequence", value: template.sequence_key },
        { name: "step", value: String(template.step) },
      ],
    }),
  }).catch((error: unknown) => ({
    ok: false,
    status: 0,
    reason: error instanceof Error ? error.message : String(error),
  }));

  if (!response) {
    return { ok: false, status: 0, reason: "network_error" };
  }

  if (response instanceof Response) {
    if (response.ok) return { ok: true };
    const message = await response.text().catch(() => "unknown_error");
    return { ok: false, status: response.status, reason: message };
  }

  return response;
}

async function markCompleted(
  lead: LeadRecord,
  reason: string,
  nowIso: string,
): Promise<void> {
  const supabase = getServiceClient();
  const meta = normalizeMetadata(lead.metadata);
  meta.last_completion = {
    reason,
    at: nowIso,
    previous_step: lead.current_step ?? 0,
  };
  const { error } = await supabase
    .from("crm_leads")
    .update({
      status: "completed",
      next_send_at: null,
      metadata: meta,
    })
    .eq("id", lead.id);
  if (error) {
    console.error(
      "[drip] Failed to mark lead complete",
      lead.id,
      error.message,
    );
  }
}

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname.endsWith("/version")) {
    return ok({ name: "drip", ts: new Date().toISOString() });
  }
  if (req.method === "HEAD") {
    return new Response(null, { status: 200 });
  }
  if (req.method !== "POST") {
    return mna();
  }

  const supabase = getServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const batchLimit = sanitizeNumber(
    optionalEnv("CRM_DRIP_BATCH_LIMIT"),
    DEFAULT_BATCH_LIMIT,
  );

  const { data, error } = await supabase
    .from("crm_leads")
    .select(
      "id,email,full_name,sequence_key,status,current_step,max_steps,cadence_hours,last_sent_at,next_send_at,replied_at,metadata",
    )
    .in("status", SENDABLE_STATUSES)
    .is("replied_at", null)
    .lte("next_send_at", nowIso)
    .order("next_send_at", { ascending: true })
    .limit(batchLimit);

  if (error) {
    console.error("[drip] Failed to load leads", error.message);
    return oops("failed_to_load_leads", error.message);
  }

  const leads = data ?? [];
  const templates = new Map<string, TemplateRecord | null>();
  const summary: SendSummary = {
    processed: leads.length,
    sent: 0,
    completed: 0,
    skipped: 0,
    errors: [],
  };

  for (const lead of leads) {
    const currentStep = sanitizeNumber(lead.current_step, 0);
    const maxSteps = sanitizeNumber(lead.max_steps, 0);

    if (lead.replied_at) {
      summary.skipped += 1;
      continue;
    }

    const nextStep = currentStep + 1;
    if (maxSteps > 0 && nextStep > maxSteps) {
      await markCompleted(lead, "step_cap_reached", nowIso);
      summary.completed += 1;
      continue;
    }

    const sequence = lead.sequence_key?.trim() || "default";
    const template = await loadTemplate(sequence, nextStep, templates);
    if (!template) {
      await markCompleted(lead, "missing_template", nowIso);
      summary.skipped += 1;
      continue;
    }

    const body = renderBody(template, lead);
    const sendResult = await sendEmail(lead, template, body);
    if (!sendResult.ok) {
      console.error("[drip] Failed to send email", lead.id, sendResult.reason);
      summary.errors.push({ leadId: lead.id, reason: sendResult.reason });
      summary.skipped += 1;
      continue;
    }

    const updatePayload: Record<string, unknown> = {
      current_step: nextStep,
      last_sent_at: nowIso,
      metadata: buildMetadata(lead, template, nextStep, nowIso),
    };

    if (maxSteps > 0 && nextStep >= maxSteps) {
      updatePayload.status = "completed";
      updatePayload.next_send_at = null;
      summary.completed += 1;
    } else {
      updatePayload.next_send_at = computeNextSendAt(lead, template, now);
    }

    const { error: updateError } = await supabase
      .from("crm_leads")
      .update(updatePayload)
      .eq("id", lead.id);

    if (updateError) {
      console.error(
        "[drip] Failed to update lead",
        lead.id,
        updateError.message,
      );
      summary.errors.push({ leadId: lead.id, reason: updateError.message });
      summary.skipped += 1;
      continue;
    }

    summary.sent += 1;
  }

  return ok(summary);
});

export default handler;
