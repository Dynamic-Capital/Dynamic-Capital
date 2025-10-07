export interface TonAccountState {
  address: string;
  balance: number;
  status: string | null;
  lastTransactionHash: string | null;
  lastTransactionLt: number | null;
  extraCurrencies: Record<string, number>;
}

export interface TonTransactionMessage {
  source?: string | null;
  destination?: string | null;
  value?: number | null;
}

export interface TonTransactionPayload {
  hash: string;
  account?: { address?: string | null } | null;
  in_msg?: TonTransactionMessage | null;
  out_msgs?: TonTransactionMessage[] | null;
  mc_block_seqno?: number | null;
  block_id?: string | null;
  now?: number | null;
  utime?: number | null;
  lt?: number | null;
  amountTon?: number | null;
  amount?: number | null;
  value?: number | null;
}

export interface TonIndexClientOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

function normaliseBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export class TonIndexClient {
  #baseUrl: string;
  #apiKey: string | null;
  #fetch: typeof fetch;

  constructor(options: TonIndexClientOptions = {}) {
    this.#baseUrl = normaliseBaseUrl(
      options.baseUrl ?? "https://tonindexer.toncenter.com/api/v3",
    );
    this.#apiKey = options.apiKey?.trim() || null;
    this.#fetch = options.fetchFn ??
      (globalThis.fetch?.bind(globalThis) ?? fetch);
  }

  async #request(path: string, init?: RequestInit): Promise<unknown> {
    const url = `${this.#baseUrl}${path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.#apiKey) {
      headers["X-Api-Key"] = this.#apiKey;
    }
    const response = await this.#fetch(url, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
    if (!response.ok) {
      throw new Error(`ton-index request failed with ${response.status}`);
    }
    return await response.json();
  }

  async getAccountStates(addresses: string[]): Promise<TonAccountState[]> {
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error("addresses must contain at least one entry");
    }
    const params = new URLSearchParams();
    for (const address of addresses) {
      if (!address || typeof address !== "string") {
        throw new Error("address entries must be strings");
      }
      params.append("address", address);
    }
    const payload = await this.#request(`/accountStates?${params.toString()}`);
    const records: TonAccountState[] = [];
    if (payload && typeof payload === "object") {
      const accounts = (payload as { accounts?: unknown }).accounts;
      if (Array.isArray(accounts)) {
        for (const entry of accounts) {
          const mapping = asRecord(entry);
          if (!mapping) continue;
          const address = String(mapping.address ?? mapping["Address"] ?? "")
            .trim();
          if (!address) continue;
          const balance =
            asNumber(mapping.balance ?? mapping["Balance"] ?? 0) ?? 0;
          const extraCurrenciesRaw = asRecord(
            mapping.extra_currencies ?? mapping.extraCurrencies ?? null,
          );
          const extraCurrencies: Record<string, number> = {};
          if (extraCurrenciesRaw) {
            for (const [key, value] of Object.entries(extraCurrenciesRaw)) {
              const numeric = asNumber(value);
              if (numeric !== null) {
                extraCurrencies[String(key)] = numeric;
              }
            }
          }
          records.push({
            address,
            balance,
            status: mapping.status ? String(mapping.status) : null,
            lastTransactionHash: mapping.last_transaction_hash
              ? String(mapping.last_transaction_hash)
              : mapping.lastTransactionHash
              ? String(mapping.lastTransactionHash)
              : null,
            lastTransactionLt: asNumber(
              mapping.last_transaction_lt ?? mapping.lastTransactionLt ?? null,
            ),
            extraCurrencies,
          });
        }
      }
    }
    return records;
  }

  async getTransaction(hash: string): Promise<TonTransactionPayload> {
    if (!hash || typeof hash !== "string") {
      throw new Error("hash must be provided");
    }
    const payload = await this.#request(`/transactions/${hash}`);
    const mapping = asRecord(payload);
    if (!mapping) {
      throw new Error("transaction payload malformed");
    }
    const outMsgsRaw = mapping.out_msgs ?? mapping.outMsgs;
    const outMsgs: TonTransactionMessage[] = [];
    if (Array.isArray(outMsgsRaw)) {
      for (const entry of outMsgsRaw) {
        const record = asRecord(entry);
        if (!record) continue;
        outMsgs.push({
          source: record.source ?? null,
          destination: record.destination ?? null,
          value: asNumber(
            record.value ?? record.coins ?? record.amount ?? null,
          ),
        });
      }
    }
    const inMsgRaw = asRecord(mapping.in_msg ?? mapping.inMsg ?? null);
    const inMsg: TonTransactionMessage | undefined = inMsgRaw
      ? {
        source: inMsgRaw.source ?? null,
        destination: inMsgRaw.destination ?? null,
        value: asNumber(
          inMsgRaw.value ?? inMsgRaw.coins ?? inMsgRaw.amount ?? null,
        ),
      }
      : undefined;
    return {
      hash: String(mapping.hash ?? hash),
      account: mapping.account && typeof mapping.account === "object"
        ? { address: (mapping.account as { address?: string }).address ?? null }
        : null,
      in_msg: inMsg,
      out_msgs: outMsgs,
      mc_block_seqno: asNumber(
        mapping.mc_block_seqno ?? mapping.mcBlockSeqno ?? null,
      ),
      block_id: typeof mapping.block_id === "string" ? mapping.block_id : null,
      now: asNumber(mapping.now ?? null),
      utime: asNumber(mapping.utime ?? null),
      lt: asNumber(mapping.lt ?? null),
      amountTon: asNumber(mapping.amountTon ?? null),
      amount: asNumber(mapping.amount ?? null),
      value: asNumber(mapping.value ?? null),
    };
  }
}
