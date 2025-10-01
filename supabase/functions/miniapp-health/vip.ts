export interface SupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        limit: (
          count: number,
        ) => Promise<
          { data?: Array<Record<string, unknown>>; error?: { message: string } }
        >;
      };
    };
  };
}

export async function getVipForTelegram(
  supa: SupabaseLike,
  tg: string,
): Promise<boolean | null> {
  const { data: users, error } = await supa
    .from("bot_users")
    .select("is_vip, subscription_expires_at")
    .eq("telegram_id", tg)
    .limit(1);
  if (error) {
    throw new Error(error.message);
  }
  let isVip: boolean | null = null;
  if (users && users.length > 0) {
    const u = users[0] as {
      is_vip?: boolean;
      subscription_expires_at?: string;
    };
    if (typeof u.is_vip === "boolean") isVip = u.is_vip;
    if (isVip === null && u.subscription_expires_at) {
      isVip = new Date(u.subscription_expires_at).getTime() >= Date.now();
    }
  }
  return isVip;
}
