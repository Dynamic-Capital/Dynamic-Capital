import { isAdmin, verifyInitDataAndGetUser } from "../_shared/telegram.ts";
import { createClient } from "../_shared/client.ts";
import { bad, corsHeaders, mna, ok, oops, unauth } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

export const handler = registerHandler(async (req) => {
  const url = new URL(req.url);
  const approveMatch = url.pathname.match(
    /\/receipt\/([^/]+)\/(approve|reject)/,
  );

  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "access-control-allow-methods": "POST,OPTIONS",
      },
    });
  }

  // Receipt upload
  if (req.method === "POST" && !approveMatch) {
    const form = await req.formData().catch(() => null);
    if (!form) return bad("Bad form data");
    const initData = String(form.get("initData") || "");
    const u = await verifyInitDataAndGetUser(initData);
    if (!u) return unauth();
    const file = form.get("image");
    if (!(file instanceof File)) return bad("image required");

    const allowed = ["image/png", "image/jpeg"];
    if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024) {
      return bad("Invalid file");
    }

    let supa;
    try {
      supa = createClient("service");
    } catch (err) {
      console.error("createClient failed", err);
      return oops("Storage unavailable");
    }
    const ext = file.name.split(".").pop();
    const path = `${u.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
    try {
      const { error } = await supa.storage.from("payment-receipts").upload(
        path,
        file,
      );
      if (error) throw error;
    } catch (err) {
      console.error("upload error", err);
      return oops("Failed to upload receipt");
    }
    return ok({ bucket: "payment-receipts", path });
  }

  // Approval / rejection
  if (req.method === "POST" && approveMatch) {
    const id = approveMatch[1];
    const action = approveMatch[2];
    let body: { initData?: string };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const u = await verifyInitDataAndGetUser(body.initData || "");
    if (!u || !isAdmin(u.id)) return unauth();
    let supa;
    try {
      supa = createClient("service");
    } catch (_) {
      supa = null;
    }
    if (supa) {
      const verdict = action === "approve" ? "approved" : "rejected";
      try {
        const { error } = await supa.from("receipts").update({ verdict }).eq(
          "id",
          id,
        );
        if (error) {
          // ignore error
        }
      } catch (_) {
        // ignore error
      }
    }
    return ok();
  }

  return mna();
});

export default handler;
