import { createClient, createClientForRequest } from "./client.ts";
import { verifyInitDataAndGetUser } from "./telegram.ts";

type ServiceClient = ReturnType<typeof createClient>;

type ExplicitId = string | number | null | undefined;

export async function resolveTelegramId(
  req: Request,
  initData?: string,
  explicit?: ExplicitId,
): Promise<string | null> {
  if (explicit) return String(explicit);

  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    try {
      const supaAuth = createClientForRequest(req, {
        auth: { persistSession: false },
      });
      const { data: { user } } = await supaAuth.auth.getUser();
      if (user) {
        const tgId = user.user_metadata?.telegram_id || user.id;
        if (tgId) return String(tgId);
      }
    } catch (err) {
      console.warn("resolveTelegramId auth fallback failed", err);
    }
  }

  if (initData) {
    const tgUser = await verifyInitDataAndGetUser(initData);
    if (tgUser) return String(tgUser.id);
  }

  return null;
}

export async function ensureUserId(
  supa: ServiceClient,
  telegramId: string,
): Promise<string> {
  const { data: existing, error: fetchError } = await supa
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (fetchError) {
    console.error("ensureUserId lookup failed", fetchError);
  }

  if (existing?.id) return existing.id as string;

  const { data, error } = await supa
    .from("users")
    .insert({ telegram_id: telegramId })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`Failed to upsert user: ${error?.message ?? "unknown"}`);
  }

  return data.id as string;
}
