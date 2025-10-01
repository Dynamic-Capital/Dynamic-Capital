#!/usr/bin/env tsx
import { createHash, generateKeyPairSync, KeyObject } from 'node:crypto';

function toHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

function exportRawPublicKey(key: KeyObject): Buffer {
  const der = key.export({ format: 'der', type: 'spki' }) as Buffer;
  return der.subarray(der.length - 32);
}

function exportRawPrivateKey(key: KeyObject): Buffer {
  const der = key.export({ format: 'der', type: 'pkcs8' }) as Buffer;
  return der.subarray(der.length - 32);
}

function computeAdnlAddress(publicKey: Buffer): string {
  const digest = createHash('sha256').update(publicKey).digest('hex');
  return `0:${digest}`;
}

function printHelp(): void {
  console.log(`Usage: npm run ton:generate-adnl [--public <base64>|<hex>]

Without arguments a new Ed25519 key pair is generated and the ADNL address is
printed alongside the raw keys. Pass an existing public key to derive an ADNL
address without creating a new key pair.

Options:
  --public <value>   Base64- or hex-encoded 32-byte Ed25519 public key.
  --help             Show this message.
`);
}

function decodeKey(value: string): Buffer {
  const trimmed = value.trim();
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }
  if (base64Regex.test(trimmed)) {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) {
      return buf;
    }
  }
  throw new Error('Public key must be a 32-byte buffer encoded as base64 or hex.');
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
  printHelp();
  process.exit(0);
}

let publicKeyInput: string | undefined;
for (let i = 0; i < args.length; i += 1) {
  const value = args[i];
  if (value === '--public') {
    if (i + 1 >= args.length) {
      console.error('Missing value for --public option.');
      process.exit(1);
    }
    publicKeyInput = args[i + 1];
    break;
  }
}

if (publicKeyInput) {
  const publicKey = decodeKey(publicKeyInput);
  if (publicKey.length !== 32) {
    console.error('Expected 32-byte public key after decoding.');
    process.exit(1);
  }
  const adnl = computeAdnlAddress(publicKey);
  console.log(JSON.stringify({ adnl, publicKeyHex: toHex(publicKey), publicKeyBase64: toBase64(publicKey) }, null, 2));
  process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const rawPublicKey = exportRawPublicKey(publicKey);
const rawPrivateKey = exportRawPrivateKey(privateKey);
const adnl = computeAdnlAddress(rawPublicKey);

const payload = {
  adnl,
  publicKey: {
    hex: toHex(rawPublicKey),
    base64: toBase64(rawPublicKey),
  },
  privateKey: {
    base64: toBase64(rawPrivateKey),
    note: 'Store this 32-byte Ed25519 seed securely; it controls the TON Site certificate.',
  },
};

console.log(JSON.stringify(payload, null, 2));
