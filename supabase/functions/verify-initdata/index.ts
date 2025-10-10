import { bad, ok } from "../_shared/http.ts";
import { verifyInitData } from "../_shared/telegram_init.ts";
import { registerHandler } from "../_shared/serve.ts";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return bad("Use POST");
  const { initData } = await req.json().catch(() => ({}));
  const passed = await verifyInitData(initData || "");
  return ok({ ok: passed });
}

registerHandler(handler);
export default handler;
export { verifyInitData as verifyFromRaw } from "../_shared/telegram_init.ts";
