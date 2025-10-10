import React from "npm:react@18.3.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { registerHandler } from "../_shared/serve.ts";
import MagicLinkEmail from "./_templates/magic-link.tsx";

interface SendEmailUser {
  email: string;
}

interface SendEmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
}

interface SendEmailPayload {
  user: SendEmailUser;
  email_data: SendEmailData;
}

const resendApiKey = Deno.env.get("RESEND_API_KEY");
if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY environment variable");
}

const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");
if (!hookSecret) {
  throw new Error("Missing SEND_EMAIL_HOOK_SECRET environment variable");
}

const resend = new Resend(resendApiKey);
const webhook = new Webhook(hookSecret);
const defaultFromAddress = Deno.env.get("SEND_EMAIL_FROM") ??
  "welcome <onboarding@resend.dev>";
const defaultSubject = Deno.env.get("SEND_EMAIL_SUBJECT") ??
  "Supa Custom MagicLink!";

export const handler = registerHandler(async (req) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  try {
    const { user, email_data }: SendEmailPayload = webhook.verify(
      payload,
      headers,
    ) as SendEmailPayload;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? email_data.site_url ??
      "";
    const tokenHash = email_data.token_hash_new ?? email_data.token_hash;
    const token = email_data.token_new ?? email_data.token;
    const redirectTo = email_data.redirect_to ?? "";

    const html = await renderAsync(
      React.createElement(MagicLinkEmail, {
        supabase_url: supabaseUrl,
        token,
        token_hash: tokenHash,
        redirect_to: redirectTo,
        email_action_type: email_data.email_action_type,
      }),
    );

    const { error } = await resend.emails.send({
      from: defaultFromAddress,
      to: [user.email],
      subject: defaultSubject,
      html,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("[send-email] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const code = typeof (error as { code?: number }).code === "number"
      ? (error as { code: number }).code
      : undefined;

    return new Response(
      JSON.stringify({
        error: {
          http_code: code,
          message,
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", "application/json");

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: responseHeaders,
  });
});

export default handler;
