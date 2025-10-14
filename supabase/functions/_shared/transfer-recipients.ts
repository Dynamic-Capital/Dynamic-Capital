import type { SupabaseClient } from "./client.ts";

export interface TransferRecipientMatch {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  currency: string;
  certificate_ids: string[];
}

const CERTIFICATE_DEFAULTS: string[] = [
  "DC-ISMS-27001-2024",
  "DC-SOC1-2024-T2",
  "DC-SOC2-2024-T2",
  "DC-PCI-2024-L1",
  "DC-GDPR-2024",
  "DPF-EE-2024-8821",
];

const RECIPIENT_CERTIFICATES: Record<string, string[]> = {
  "7730000133061": [
    "DC-ISMS-27001-2024",
    "DC-SOC1-2024-T2",
    "DC-SOC2-2024-T2",
    "DC-PCI-2024-L1",
  ],
  "90103101672241000": [
    "DC-ISMS-27001-2024",
    "DC-SOC2-2024-T2",
    "DC-PCI-2024-L1",
  ],
  "90103101672242000": [
    "DC-ISMS-27001-2024",
    "DC-SOC2-2024-T2",
    "DC-PCI-2024-L1",
    "DPF-EE-2024-8821",
  ],
};

function normalizeAccountNumber(accountNumber: string | null | undefined) {
  return accountNumber?.replace(/\s+/g, "") ?? null;
}

function normalizeName(name: string | null | undefined) {
  return name?.replace(/\s+/g, " ").trim().toLowerCase() ?? null;
}

export async function findTransferRecipient(
  supabase: SupabaseClient,
  opts: {
    accountNumber?: string | null;
    accountName?: string | null;
  },
): Promise<TransferRecipientMatch | null> {
  const normalizedAccount = normalizeAccountNumber(opts.accountNumber);
  const normalizedName = normalizeName(opts.accountName);

  let query = supabase
    .from("bank_accounts")
    .select(
      "id,bank_name,account_name,account_number,currency,is_active",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(5);

  if (normalizedAccount) {
    query = query.eq("account_number", normalizedAccount);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("findTransferRecipient query failed", error);
    return null;
  }

  let candidate = data?.[0] ?? null;
  if (!candidate && normalizedName) {
    const { data: byName, error: nameError } = await supabase
      .from("bank_accounts")
      .select(
        "id,bank_name,account_name,account_number,currency,is_active",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (nameError) {
      console.warn("findTransferRecipient name lookup failed", nameError);
      return null;
    }
    candidate = byName?.find((row) => {
      const rowName = normalizeName(row.account_name);
      return rowName && normalizedName && rowName === normalizedName;
    }) ?? null;
  }

  if (!candidate) return null;

  const account = normalizeAccountNumber(candidate.account_number) ?? "";
  const certificateIds = RECIPIENT_CERTIFICATES[account] ??
    CERTIFICATE_DEFAULTS;

  return {
    id: String(candidate.id),
    bank_name: candidate.bank_name,
    account_name: candidate.account_name,
    account_number: account,
    currency: candidate.currency,
    certificate_ids: certificateIds,
  };
}
