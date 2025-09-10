export async function expectedSecret() {
  return Deno.env.get('TELEGRAM_WEBHOOK_SECRET') || null;
}
export async function validateTelegramHeader(req: Request) {
  const exp = Deno.env.get('TELEGRAM_WEBHOOK_SECRET');
  const got = req.headers.get('x-telegram-bot-api-secret-token');
  if (!exp || got !== exp) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null;
}
