function decodeBase64Url(input: string): Uint8Array {
  const normalized = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function crc16Ccitt(data: Uint8Array): number {
  let crc = 0xffff;
  for (const byte of data) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc & 0xffff;
}

export interface NormalisedTonAddress {
  raw: string;
  friendly?: string;
  bounceable: boolean;
  testOnly: boolean;
}

function encodeRaw(workchain: number, hash: Uint8Array): string {
  const prefix = `${workchain}:${
    Array.from(hash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }`;
  return prefix.toLowerCase();
}

export function normaliseTonAddress(value: string): NormalisedTonAddress {
  if (typeof value !== "string") {
    throw new Error("address must be a string");
  }
  const trimmed = value.trim();
  if (!trimmed) throw new Error("address must not be empty");

  if (trimmed.includes(":")) {
    const [workchainPart, hashPart] = trimmed.split(":");
    if (
      !hashPart || hashPart.length !== 64 || !/^[-0-9]+$/.test(workchainPart)
    ) {
      throw new Error("address not in recognised format");
    }
    if (!/^[0-9a-fA-F]{64}$/.test(hashPart)) {
      throw new Error("address hash must be 64 hex chars");
    }
    const workchain = Number(workchainPart);
    if (!Number.isInteger(workchain) || workchain < -128 || workchain > 127) {
      throw new Error("workchain out of range");
    }
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = Number.parseInt(hashPart.slice(i * 2, i * 2 + 2), 16);
    }
    return {
      raw: encodeRaw(workchain, hash),
      bounceable: true,
      testOnly: false,
    };
  }

  try {
    const bytes = decodeBase64Url(trimmed);
    if (bytes.length !== 36) {
      throw new Error("friendly address must decode to 36 bytes");
    }
    const payload = bytes.subarray(0, 34);
    const checksum = (bytes[34] << 8) | bytes[35];
    if (crc16Ccitt(payload) !== checksum) {
      throw new Error("invalid checksum");
    }
    const tag = payload[0];
    const bounceable = (tag & 0x80) === 0;
    const testOnly = (tag & 0x40) !== 0;
    const workchainRaw = payload[1] >= 128 ? payload[1] - 256 : payload[1];
    const hash = payload.subarray(2);
    return {
      raw: encodeRaw(workchainRaw, hash),
      friendly: trimmed,
      bounceable,
      testOnly,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `invalid TON address: ${error.message}`
        : "invalid TON address",
    );
  }
}

export function isTonAddress(value: string): boolean {
  try {
    normaliseTonAddress(value);
    return true;
  } catch {
    return false;
  }
}
