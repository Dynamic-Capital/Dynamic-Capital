interface TonEventActionBase {
  type?: string;
  status?: string;
  base_transactions?: unknown;
  [key: string]: unknown;
}

interface TonEventJettonMeta {
  decimals?: number;
}

interface TonEventJettonMintPayload {
  amount?: string | number;
  jetton?: TonEventJettonMeta | null;
}

interface TonEventJettonMintAction extends TonEventActionBase {
  type?: "JettonMint" | string;
  JettonMint?: TonEventJettonMintPayload | null;
}

type TonEventAction = TonEventActionBase | TonEventJettonMintAction;

interface TonApiEvent {
  actions?: TonEventAction[] | null;
  [key: string]: unknown;
}

interface TonApiEventList {
  events?: TonApiEvent[] | null;
  [key: string]: unknown;
}

export type TonEventPayload = TonApiEvent | TonApiEventList;

export interface JettonMintSummary {
  amountRaw: bigint;
  decimals: number;
  amount: number | null;
  amountString: string;
  txHash: string | null;
  txHashes: string[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toBigInt(value: string | number): bigint | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^[-+]?[0-9]+$/.test(trimmed)) return null;
    try {
      return BigInt(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

function formatJettonAmount(raw: bigint, decimals: number): string {
  if (decimals <= 0) return raw.toString();
  const divisor = 10n ** BigInt(decimals);
  const integer = raw / divisor;
  const fraction = raw % divisor;
  if (fraction === 0n) {
    return integer.toString();
  }
  const fractionString = fraction.toString().padStart(decimals, "0").replace(
    /0+$/,
    "",
  );
  return `${integer.toString()}.${fractionString}`;
}

function safeNumberFromDecimal(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractBaseTransactionStrings(baseTransactions: unknown): string[] {
  if (!Array.isArray(baseTransactions)) return [];
  const hashes: string[] = [];
  for (const entry of baseTransactions) {
    if (typeof entry === "string" && entry.length > 0) {
      hashes.push(entry);
    }
  }
  return hashes;
}

function gatherActionGroups(
  event: TonEventPayload | null | undefined,
): TonEventAction[][] {
  if (!event || !isObject(event)) return [];

  const groups: TonEventAction[][] = [];
  const seen = new Set<TonEventAction[]>();
  const maybeList = event as TonApiEventList;
  if (Array.isArray(maybeList.events)) {
    for (const candidate of maybeList.events) {
      if (
        candidate && isObject(candidate) && Array.isArray(candidate.actions)
      ) {
        const actions = candidate.actions as TonEventAction[];
        if (!seen.has(actions)) {
          seen.add(actions);
          groups.push(actions);
        }
      }
    }
  }

  const maybeSingle = event as TonApiEvent;
  if (Array.isArray(maybeSingle.actions)) {
    const actions = maybeSingle.actions as TonEventAction[];
    if (!seen.has(actions)) {
      seen.add(actions);
      groups.push(actions);
    }
  }

  return groups;
}

function extractJettonMintAction(
  groups: TonEventAction[][],
): { action: TonEventJettonMintAction; group: TonEventAction[] } | null {
  for (const actions of groups) {
    for (const action of actions) {
      if (!isObject(action)) continue;
      if (action.type !== "JettonMint") continue;
      if (action.status && action.status !== "ok") continue;
      return { action: action as TonEventJettonMintAction, group: actions };
    }
  }
  return null;
}

export function extractJettonMintSummary(
  event: TonEventPayload | null | undefined,
): JettonMintSummary | null {
  const groups = gatherActionGroups(event);
  if (groups.length === 0) return null;

  const mintResult = extractJettonMintAction(groups);
  if (!mintResult) return null;

  const { action, group } = mintResult;
  const payload = action.JettonMint ?? undefined;
  if (!payload) return null;
  const amountRaw = toBigInt(payload.amount ?? "");
  if (amountRaw === null || amountRaw < 0n) return null;
  const decimals = Number(payload.jetton?.decimals ?? 0);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    return null;
  }
  const amountString = formatJettonAmount(amountRaw, decimals);
  const amount = safeNumberFromDecimal(amountString);
  const mintedTxs = extractBaseTransactionStrings(
    action.base_transactions ?? null,
  );
  const txSet = new Set<string>();
  for (const hash of mintedTxs) txSet.add(hash);

  const addHashesFromAction = (candidate: TonEventAction) => {
    if (!isObject(candidate)) return;
    if (candidate === action) return;
    if (candidate.status && candidate.status !== "ok") return;
    if (candidate.type !== "SmartContractExec") return;
    const hashes = extractBaseTransactionStrings(
      candidate.base_transactions ?? null,
    );
    for (const hash of hashes) txSet.add(hash);
  };

  for (const candidate of group) {
    addHashesFromAction(candidate);
  }

  for (const actions of groups) {
    if (actions === group) continue;
    for (const candidate of actions) {
      addHashesFromAction(candidate);
    }
  }
  const txHashes = [...txSet];
  const txHash = mintedTxs[0] ?? txHashes[0] ?? null;
  return { amountRaw, decimals, amount, amountString, txHash, txHashes };
}

export function decimalToScaledBigInt(value: number, decimals: number): bigint {
  if (!Number.isFinite(value)) {
    throw new Error("Invalid decimal amount");
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new Error("Invalid decimal precision");
  }
  const factor = 10n ** BigInt(decimals);
  if (decimals === 0) return BigInt(Math.trunc(value));
  const fixed = value.toFixed(decimals);
  const [whole, fraction = ""] = fixed.split(".");
  const fractionNormalized = fraction.padEnd(decimals, "0").slice(0, decimals);
  const wholePart = BigInt(whole);
  const fractionPart = BigInt(fractionNormalized);
  return wholePart * factor + fractionPart;
}
