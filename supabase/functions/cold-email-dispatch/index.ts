import { createClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type LeadStatus =
  | "NEW"
  | "SENT"
  | "REPLIED"
  | "BOUNCED"
  | "UNSUBSCRIBED";

type Provider = "resend" | "gmail";

type LeadRow = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  status: LeadStatus;
};

type TemplateRow = {
  id: string;
  subject: string;
  body: string;
  name: string;
};

type DispatchResult = {
  leadId: string;
  email: string;
  status: "sent" | "skipped" | "failed";
  messageId?: string | null;
  error?: string;
};

type DispatchSummary = {
  processed: DispatchResult[];
  totals: Record<DispatchResult["status"], number>;
};

interface DispatchRequestBody {
  templateId?: string;
  provider?: Provider;
  leadIds?: string[];
  batchSize?: number;
  concurrency?: number;
}

function sanitizePlaceholderValue(value: string | null | undefined): string {
  if (!value) return "";
  return value;
}

function renderTemplate(text: string, lead: LeadRow): string {
  return text.replace(/{{\s*(name|company)\s*}}/gi, (_, key) => {
    const normalized = String(key).toLowerCase();
    switch (normalized) {
      case "name":
        return sanitizePlaceholderValue(lead.name);
      case "company":
        return sanitizePlaceholderValue(lead.company);
      default:
        return "";
    }
  });
}

async function sendViaResend(
  lead: LeadRow,
  template: TemplateRow,
  subject: string,
  body: string,
): Promise<{ messageId: string | null }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  const replyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL");

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY env");
  }
  if (!fromEmail) {
    throw new Error("Missing RESEND_FROM_EMAIL env");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: lead.email,
      subject,
      html: body,
      reply_to: replyTo ?? undefined,
      tags: [
        { name: "lead_id", value: lead.id },
        { name: "template_id", value: template.id },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.message === "string"
      ? payload.message
      : JSON.stringify(payload);
    throw new Error(`Resend error: ${message}`);
  }

  return { messageId: typeof payload?.id === "string" ? payload.id : null };
}

function encodeBase64Url(input: string): string {
  return btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendViaGmail(
  lead: LeadRow,
  template: TemplateRow,
  subject: string,
  body: string,
): Promise<{ messageId: string | null }> {
  const accessToken = Deno.env.get("GMAIL_ACCESS_TOKEN");
  const sender = Deno.env.get("GMAIL_SENDER");

  if (!accessToken) {
    throw new Error("Missing GMAIL_ACCESS_TOKEN env");
  }
  if (!sender) {
    throw new Error("Missing GMAIL_SENDER env");
  }

  const mimeParts = [
    'Content-Type: text/html; charset="UTF-8"',
    "MIME-Version: 1.0",
    `To: ${lead.email}`,
    `From: ${sender}`,
    `Subject: ${subject}`,
    "",
    body,
  ];

  const rawMessage = encodeBase64Url(mimeParts.join("\r\n"));

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawMessage }),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = typeof payload?.error?.message === "string"
      ? payload.error.message
      : JSON.stringify(payload);
    throw new Error(`Gmail error: ${message}`);
  }

  return {
    messageId: typeof payload?.id === "string" ? payload.id : null,
  };
}

async function sendEmail(
  provider: Provider,
  lead: LeadRow,
  template: TemplateRow,
  subject: string,
  body: string,
): Promise<{ messageId: string | null }> {
  switch (provider) {
    case "gmail":
      return await sendViaGmail(lead, template, subject, body);
    case "resend":
    default:
      return await sendViaResend(lead, template, subject, body);
  }
}

async function fetchTemplate(
  client: ReturnType<typeof createClient>,
  templateId?: string,
): Promise<TemplateRow | null> {
  const query = client.from("templates").select("id, subject, body, name");

  if (templateId) {
    const { data, error } = await query.eq("id", templateId).maybeSingle();
    if (error) throw error;
    return data ?? null;
  }

  const { data, error } = await query.order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function fetchLeads(
  client: ReturnType<typeof createClient>,
  leadIds: string[] | undefined,
  batchSize: number,
): Promise<LeadRow[]> {
  const query = client.from("leads").select(
    "id, name, email, company, status",
  ).eq("status", "NEW" as LeadStatus);

  if (leadIds && leadIds.length > 0) {
    query.in("id", leadIds);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(batchSize);
  if (error) throw error;
  return data ?? [];
}

async function updateLeadStatus(
  client: ReturnType<typeof createClient>,
  leadId: string,
  status: LeadStatus,
  lastContacted: string | null,
) {
  const update = client.from("leads").update({
    status,
    last_contacted: lastContacted,
  }).eq("id", leadId);
  const { error } = await update;
  if (error) throw error;
}

async function logDispatch(
  client: ReturnType<typeof createClient>,
  leadId: string,
  templateId: string,
  status: "QUEUED" | "SENT" | "FAILED",
  messageId: string | null,
  error: string | null,
): Promise<string> {
  const { data, error: insertError } = await client.from("logs").insert({
    lead_id: leadId,
    template_id: templateId,
    status,
    message_id: messageId,
    error,
  }).select("id").single();

  if (insertError) throw insertError;
  return data.id as string;
}

async function updateLogStatus(
  client: ReturnType<typeof createClient>,
  logId: string,
  status: "SENT" | "FAILED",
  messageId: string | null,
  error: string | null,
) {
  const { error } = await client.from("logs").update({
    status,
    message_id: messageId,
    error,
  }).eq("id", logId);
  if (error) throw error;
}

async function processLead(
  client: ReturnType<typeof createClient>,
  provider: Provider,
  template: TemplateRow,
  lead: LeadRow,
): Promise<DispatchResult> {
  const subject = renderTemplate(template.subject, lead);
  const body = renderTemplate(template.body, lead);

  let logId: string | null = null;
  try {
    logId = await logDispatch(
      client,
      lead.id,
      template.id,
      "QUEUED",
      null,
      null,
    );
  } catch (logError) {
    console.error("Failed to queue log entry", logError);
  }

  if (!lead.email) {
    if (logId) {
      await updateLogStatus(
        client,
        logId,
        "FAILED",
        null,
        "Lead missing email",
      );
    }
    return {
      leadId: lead.id,
      email: lead.email,
      status: "skipped",
      error: "Lead missing email",
    };
  }

  try {
    const { messageId } = await sendEmail(
      provider,
      lead,
      template,
      subject,
      body,
    );
    if (logId) {
      await updateLogStatus(client, logId, "SENT", messageId, null);
    }
    const now = new Date().toISOString();
    await updateLeadStatus(client, lead.id, "SENT", now);
    return { leadId: lead.id, email: lead.email, status: "sent", messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (logId) {
      await updateLogStatus(client, logId, "FAILED", null, message);
    }
    console.error("Failed to send email", { leadId: lead.id, message });
    return {
      leadId: lead.id,
      email: lead.email,
      status: "failed",
      error: message,
    };
  }
}

async function processWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!items.length) return [];

  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= items.length) break;
      results[currentIndex] = await handler(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(limit, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function shouldSkipLead(lead: LeadRow): DispatchResult | null {
  if (lead.status === "UNSUBSCRIBED" || lead.status === "REPLIED") {
    return {
      leadId: lead.id,
      email: lead.email,
      status: "skipped",
      error: `Lead status is ${lead.status}`,
    };
  }

  if (!lead.email) {
    return {
      leadId: lead.id,
      email: lead.email,
      status: "skipped",
      error: "Lead missing email",
    };
  }

  return null;
}

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  let body: DispatchRequestBody = {};
  try {
    body = await req.json() as DispatchRequestBody;
  } catch {
    // ignore parsing errors and keep defaults
  }

  const provider: Provider = (body.provider ?? "resend") as Provider;
  const batchSize = Math.min(Math.max(body.batchSize ?? 25, 1), 100);
  const concurrency = Math.min(Math.max(body.concurrency ?? 5, 1), 20);

  const client = createClient("service");

  try {
    const template = await fetchTemplate(client, body.templateId);
    if (!template) {
      return new Response(
        JSON.stringify({ error: "No template found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const leads = await fetchLeads(client, body.leadIds, batchSize);
    if (!leads.length) {
      return new Response(
        JSON.stringify({
          message: "No leads to process",
          processed: [],
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const results = await processWithConcurrency(
      leads,
      concurrency,
      async (lead) => {
        const skipped = shouldSkipLead(lead);
        if (skipped) {
          if (skipped.error === "Lead missing email") {
            // Keep logging behavior consistent with processLead: attempt to record failure.
            try {
              const logId = await logDispatch(
                client,
                lead.id,
                template.id,
                "QUEUED",
                null,
                null,
              );
              await updateLogStatus(
                client,
                logId,
                "FAILED",
                null,
                skipped.error,
              );
            } catch (loggingError) {
              console.error("Failed to log skipped lead", loggingError);
            }
          }
          return skipped;
        }

        return await processLead(client, provider, template, lead);
      },
    );

    const summary = results.reduce<DispatchSummary>(
      (acc, result) => {
        acc.processed.push(result);
        acc.totals[result.status] += 1;
        return acc;
      },
      {
        processed: [],
        totals: { sent: 0, failed: 0, skipped: 0 },
      },
    );

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Cold email dispatch failed", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});

export default handler;
