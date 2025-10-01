import { z } from "zod";

import { createClient } from "@/integrations/supabase/client";
import { withApiMetrics } from "@/observability/server-metrics.ts";
import {
  bad,
  corsHeaders,
  json,
  methodNotAllowed,
  oops,
} from "@/utils/http.ts";

const ROUTE_NAME = "/api/admin/invite-user";

const inviteSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  role: z.string().optional(),
  telegramId: z.string().optional(),
  username: z.string().optional(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withApiMetrics(req, ROUTE_NAME, async () => {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch (error) {
      return bad(
        "Invalid JSON payload",
        error instanceof Error ? error.message : undefined,
        req,
      );
    }

    const parsed = inviteSchema.safeParse(payload);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message).join(
        ", ",
      );
      return bad("Invalid invite payload", details, req);
    }

    const { email, firstName, lastName, role, telegramId, username } =
      parsed.data;

    let supabaseAdmin;
    try {
      supabaseAdmin = createClient("service");
    } catch (error) {
      console.error("Failed to create Supabase admin client", error);
      return oops(
        "Supabase service role key is not configured",
        undefined,
        req,
      );
    }

    const redirectTo = (() => {
      if (typeof process === "undefined") {
        return undefined;
      }
      const configuredBase = process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.SITE_URL;
      if (!configuredBase) {
        return undefined;
      }
      const normalizedBase = configuredBase.endsWith("/")
        ? configuredBase.slice(0, -1)
        : configuredBase;
      return `${normalizedBase}/login`;
    })();

    const metadata: Record<string, unknown> = {
      first_name: firstName,
      last_name: lastName ?? null,
      role: role ?? "user",
      telegram_id: telegramId ?? null,
      username: username ?? null,
    };

    try {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: metadata,
          redirectTo,
        },
      );

      if (error) {
        console.error("Supabase invite error", error);
        return bad("Failed to send invite", error.message, req);
      }

      return json({ ok: true, user: data.user }, 200, {}, req);
    } catch (error) {
      console.error("Unexpected invite error", error);
      return oops("Unexpected error inviting user", undefined, req);
    }
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;

export function OPTIONS(req: Request) {
  const headers = corsHeaders(req, "POST");
  return new Response(null, { status: 204, headers });
}
