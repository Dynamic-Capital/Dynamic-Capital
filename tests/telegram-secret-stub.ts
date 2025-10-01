export function expectedSecret(): Promise<string | null> {
  return Promise.resolve(Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || null);
}
export function validateTelegramHeader(
  req: Request,
): Promise<Response | null> {
  const exp = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  const got = req.headers.get("x-telegram-bot-api-secret-token");
  if (!exp || got !== exp) {
    return Promise.resolve(new Response("Unauthorized", { status: 401 }));
  }
  return Promise.resolve(null);
}
