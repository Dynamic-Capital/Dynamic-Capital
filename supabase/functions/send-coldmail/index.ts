import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "team@dynamiccapital.com";
const MAX_SEND_PER_RUN = Number(Deno.env.get("MAX_SEND_PER_RUN") ?? "10");
const DAY_IN_MS = 86_400_000;

type LeadStatus =
  | "NEW"
  | "IN_SEQUENCE"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "UNSUBSCRIBED";

type Lead = {
  id: string;
  email: string | null;
  name?: string | null;
  company?: string | null;
  status: LeadStatus | string;
  sequence_step?: number | null;
  next_contact_at?: string | null;
  sequence?: string | null;
  unsubscribed?: boolean | null;
};

type Template = {
  id: string;
  subject: string;
  body: string;
  sequence_step?: number | null;
  delay_days?: number | null;
};

type SendSummary = {
  leadId: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  detail: string;
};

type ResendResult = {
  [key: string]: unknown;
  id?: string;
};

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY env var is required");
}

const templateCache = new Map<string, Template | null>();

function mergePlaceholders(templateText: string, lead: Lead): string {
  return templateText
    .replace(/\{\{name\}\}/gi, lead.name?.trim() ?? "there")
    .replace(/\{\{company\}\}/gi, lead.company?.trim() ?? "");
}

async function fetchTemplate(step: number): Promise<Template | null> {
  const cacheKey = String(step);
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey) ?? null;
  }

  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("sequence_step", step)
    .limit(1);

  if (error) {
    console.error("Failed to fetch template", error);
    templateCache.set(cacheKey, null);
    return null;
  }

  const template = data?.[0] ?? null;
  templateCache.set(cacheKey, template ?? null);
  return template;
}

async function handleSend(lead: Lead): Promise<SendSummary | null> {
  if (lead.status === "UNSUBSCRIBED" || lead.unsubscribed) {
    return {
      leadId: lead.id,
      status: "SKIPPED",
      detail: "Lead unsubscribed",
    };
  }

  if (!lead.email) {
    console.warn(`Lead ${lead.id} is missing an email address`);
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "FAILED",
        last_contacted: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("Failed to mark lead as failed due to missing email", {
        leadId: lead.id,
        error: updateError,
      });
    }

    return {
      leadId: lead.id,
      status: "FAILED",
      detail: "Missing email",
    };
  }

  const now = new Date();
  if (
    lead.next_contact_at &&
    new Date(lead.next_contact_at).getTime() > now.getTime()
  ) {
    return null;
  }

  const claimed = await claimLead(lead);
  if (!claimed) {
    return {
      leadId: lead.id,
      status: "SKIPPED",
      detail: "Lead already being processed",
    };
  }

  const nextStep = (lead.sequence_step ?? 0) + 1;
  const template = await fetchTemplate(nextStep);

  if (!template) {
    await supabase
      .from("leads")
      .update({
        status: "COMPLETED",
        sequence_step: lead.sequence_step ?? 0,
        next_contact_at: null,
      })
      .eq("id", lead.id);

    return {
      leadId: lead.id,
      status: "SKIPPED",
      detail: `No template defined for step ${nextStep}`,
    };
  }

  const subject = mergePlaceholders(template.subject, lead);
  const body = mergePlaceholders(template.body, lead);

  let resendResponse: Response;
  try {
    resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: lead.email,
        subject,
        html: body,
      }),
    });
  } catch (error) {
    await recordAttempt({
      lead,
      template,
      ok: false,
      result: { error: String(error) },
      nextStep,
      nextContactDelayDays: template.delay_days,
      timestamp: now,
    });

    return {
      leadId: lead.id,
      status: "FAILED",
      detail: `Network error: ${String(error)}`,
    };
  }

  const result = await resendResponse.json().catch(() => ({})) as ResendResult;

  await recordAttempt({
    lead,
    template,
    ok: resendResponse.ok,
    result,
    nextStep,
    nextContactDelayDays: template.delay_days,
    timestamp: now,
  });

  if (!resendResponse.ok) {
    return {
      leadId: lead.id,
      status: "FAILED",
      detail: JSON.stringify(result),
    };
  }

  return {
    leadId: lead.id,
    status: "SENT",
    detail: result?.id ? `Message ID ${result.id}` : "Sent",
  };
}

type RecordAttemptArgs = {
  lead: Lead;
  template: Template;
  ok: boolean;
  result: ResendResult;
  nextStep: number;
  nextContactDelayDays?: number | null;
  timestamp: Date;
};

async function recordAttempt({
  lead,
  template,
  ok,
  result,
  nextStep,
  nextContactDelayDays,
  timestamp,
}: RecordAttemptArgs) {
  const nextContactAt = ok && nextContactDelayDays
    ? new Date(timestamp.getTime() + nextContactDelayDays * DAY_IN_MS)
      .toISOString()
    : null;

  const [logResult, leadUpdateResult] = await Promise.all([
    supabase.from("logs").insert({
      lead_id: lead.id,
      template_id: template.id,
      status: ok ? "SENT" : "FAILED",
      message_id: ok && typeof result?.id === "string" ? result.id : null,
      error: ok ? null : JSON.stringify(result),
      sequence_step: nextStep,
      sent_at: timestamp.toISOString(),
    }),
    supabase
      .from("leads")
      .update({
        status: ok ? (nextContactAt ? "IN_SEQUENCE" : "COMPLETED") : "FAILED",
        sequence_step: ok ? nextStep : lead.sequence_step ?? 0,
        last_contacted: timestamp.toISOString(),
        next_contact_at: nextContactAt,
      })
      .eq("id", lead.id),
  ]);

  if (logResult.error) {
    console.error("Failed to log outreach attempt", {
      leadId: lead.id,
      templateId: template.id,
      error: logResult.error,
    });
  }

  if (leadUpdateResult.error) {
    console.error("Failed to update lead after outreach", {
      leadId: lead.id,
      error: leadUpdateResult.error,
    });
  }
}

async function claimLead(lead: Lead): Promise<boolean> {
  if (lead.status === "PROCESSING") {
    return false;
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ status: "PROCESSING" as LeadStatus })
    .eq("id", lead.id)
    .in("status", ["NEW", "IN_SEQUENCE"])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to claim lead", { leadId: lead.id, error });
    return false;
  }

  return Boolean(data?.id);
}

serve(async () => {
  const { data: leads, error: leadErr } = await supabase
    .from("leads")
    .select("*")
    .or("status.eq.NEW,status.eq.IN_SEQUENCE")
    .order("next_contact_at", { ascending: true, nullsFirst: true })
    .limit(MAX_SEND_PER_RUN * 2);

  if (leadErr || !leads || leads.length === 0) {
    return new Response("No leads to process", { status: 200 });
  }

  const summaries: SendSummary[] = [];

  for (const lead of leads) {
    if (summaries.length >= MAX_SEND_PER_RUN) {
      break;
    }

    const summary = await handleSend(lead as Lead);
    if (summary) {
      summaries.push(summary);
    }
  }

  if (summaries.length === 0) {
    return new Response("No leads ready for outreach", { status: 200 });
  }

  return new Response(
    JSON.stringify({
      processed: summaries.length,
      results: summaries,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
});
