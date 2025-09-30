import type { SupabaseClient } from "./client.ts";

export type EcosystemUser = {
  id: string;
  auth_user_id: string | null;
  wallet: string;
  email: string | null;
  role: string;
  dct_balance: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export interface EnsureUserOptions {
  userId?: string | null;
  authUserId?: string | null;
  wallet?: string | null;
  email?: string | null;
  role?: string | null;
  dctBalance?: number | string | null;
  metadata?: Record<string, unknown> | null;
}

const mentorRoles = new Set([
  "mentor",
  "admin",
  "operator",
  "strategist",
  "analyst",
]);

function sanitizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeWallet(value: unknown): string | null {
  const wallet = sanitizeString(value);
  if (!wallet) return null;
  return wallet;
}

function normalizeEmail(value: unknown): string | null {
  const email = sanitizeString(value);
  return email ? email.toLowerCase() : null;
}

function normalizeRole(value: unknown): string {
  const role = sanitizeString(value)?.toLowerCase();
  if (!role) return "member";
  return role;
}

function normalizeUuid(value: unknown): string | null {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(raw) ? raw : null;
}

export function isMentorRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return mentorRoles.has(role.toLowerCase());
}

export async function findUserByWallet(
  supabase: SupabaseClient,
  wallet: string,
): Promise<EcosystemUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle<EcosystemUser>();
  if (error) {
    console.error("Failed to look up user by wallet", error.message);
    return null;
  }
  return data ?? null;
}

export async function ensureEcosystemUser(
  supabase: SupabaseClient,
  options: EnsureUserOptions,
): Promise<EcosystemUser> {
  const normalizedId = normalizeUuid(options.userId ?? options.authUserId);
  const normalizedAuthId = normalizeUuid(options.authUserId);
  const wallet = normalizeWallet(options.wallet);
  const email = normalizeEmail(options.email);
  const role = normalizeRole(options.role);
  const metadata = options.metadata ?? null;

  if (!normalizedId && !wallet) {
    throw new Error(
      "userId or wallet is required to resolve an ecosystem user",
    );
  }

  const identifiers = [] as Array<[string, string]>;
  if (normalizedId) identifiers.push(["id", normalizedId]);
  if (wallet) identifiers.push(["wallet", wallet]);
  if (normalizedAuthId) identifiers.push(["auth_user_id", normalizedAuthId]);

  let existing: EcosystemUser | null = null;
  for (const [column, value] of identifiers) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq(column, value)
      .maybeSingle<EcosystemUser>();
    if (error) {
      console.error(
        `Failed to resolve ecosystem user via ${column}`,
        error.message,
      );
      continue;
    }
    if (data) {
      existing = data;
      break;
    }
  }

  const parsedBalance = options.dctBalance === null ||
      options.dctBalance === undefined
    ? null
    : Number(options.dctBalance);
  const hasBalanceUpdate = parsedBalance !== null &&
    !Number.isNaN(parsedBalance);

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (wallet && existing.wallet !== wallet) updates.wallet = wallet;
    if (email && existing.email !== email) updates.email = email;
    if (role && existing.role !== role) updates.role = role;
    if (hasBalanceUpdate && existing.dct_balance !== parsedBalance) {
      updates.dct_balance = parsedBalance;
    }
    if (
      metadata &&
      JSON.stringify(existing.metadata ?? null) !== JSON.stringify(metadata)
    ) {
      updates.metadata = metadata;
    }
    if (normalizedAuthId && existing.auth_user_id !== normalizedAuthId) {
      updates.auth_user_id = normalizedAuthId;
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle<EcosystemUser>();
    if (error || !data) {
      console.error("Failed to update ecosystem user", error?.message);
      return existing;
    }
    return data;
  }

  const insertPayload: Record<string, unknown> = {
    wallet,
    email,
    role,
    metadata,
  };

  if (normalizedId) insertPayload.id = normalizedId;
  if (normalizedAuthId) insertPayload.auth_user_id = normalizedAuthId;
  if (hasBalanceUpdate) insertPayload.dct_balance = parsedBalance;

  const { data, error } = await supabase
    .from("users")
    .insert(insertPayload)
    .select("*")
    .maybeSingle<EcosystemUser>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create ecosystem user");
  }

  return data;
}

export async function linkPaymentToUser(
  supabase: SupabaseClient,
  paymentId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .update({ ecosystem_user_id: userId })
    .eq("id", paymentId);
  if (error) {
    console.error("Failed to link payment to ecosystem user", error.message);
  }
}

export async function listVerifiedPayments(
  supabase: SupabaseClient,
  filters: { userId?: string | null; wallet?: string | null },
): Promise<Array<{ amount_ton: number | null }>> {
  let query = supabase
    .from("payments")
    .select("amount_ton, wallet, ecosystem_user_id, verified")
    .eq("verified", true);

  if (filters.userId) {
    query = query.eq("ecosystem_user_id", filters.userId);
  }

  if (filters.wallet) {
    query = query.eq("wallet", filters.wallet);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to load verified payments", error.message);
    return [];
  }

  return (data ?? []) as Array<{ amount_ton: number | null }>;
}
