import axios from "axios";
import { Buffer } from "node:buffer";
import { Address, Cell, beginCell } from "@ton/core";
import { mnemonicToPrivateKey, sign } from "ton-crypto";
import {
  TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  TON_MAINNET_DCT_TREASURY_ALIAS,
  TON_MAINNET_DCT_TREASURY_WALLET,
  TON_MAINNET_DCT_WALLET_V5R1,
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_DCT_JETTON_WALLET,
  TON_MAINNET_STONFI_ROUTER,
} from "../../../shared/ton/mainnet-addresses";

const DOMAIN = "dynamiccapital.ton";
const METADATA_URL = "https://dynamiccapital.ton/jetton-metadata.json";
const RPC_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";
const TON_VIEWER_JETTON_URL =
  `https://tonviewer.com/jetton/${TON_MAINNET_JETTON_MASTER}`;
const TONSCAN_JETTON_URL =
  `https://tonscan.org/jetton/${TON_MAINNET_JETTON_MASTER}`;

const dnsRecord: Record<string, string> = {
  ton_alias: TON_MAINNET_DCT_TREASURY_ALIAS,
  jetton_master: TON_MAINNET_JETTON_MASTER,
  treasury_wallet: TON_MAINNET_DCT_TREASURY_WALLET,
  stonfi_pool: TON_MAINNET_STONFI_ROUTER,
  stonfi_jetton_wallet: TON_MAINNET_STONFI_DCT_JETTON_WALLET,
  wallet_v5r1: TON_MAINNET_DCT_WALLET_V5R1,
  dedust_pool: TON_MAINNET_DEDUST_DCT_TON_POOL,
  dedust_jetton_wallet: TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  jetton_tonviewer: TON_VIEWER_JETTON_URL,
  jetton_tonscan: TONSCAN_JETTON_URL,
  dao_contract: "EQDAOxyz...daoAddr",
  metadata: METADATA_URL,
  api: "https://api.dynamiccapital.ton",
  manifest: "https://dynamiccapital.ton/tonconnect-manifest.json",
  docs: "https://dynamiccapital.ton/docs",
};

async function fetchJettonWallet(ownerFriendly: string): Promise<string> {
  const ownerAddress = Address.parse(ownerFriendly);
  const stackSlice = beginCell()
    .storeAddress(ownerAddress)
    .endCell()
    .toBoc({ idx: false })
    .toString("base64");

  const response = await fetch(RPC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "runGetMethod",
      params: {
        address: TON_MAINNET_JETTON_MASTER,
        method: "get_wallet_address",
        stack: [["tvm.Slice", stackSlice]],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `runGetMethod HTTP ${response.status} when deriving wallet for ${ownerFriendly}`,
    );
  }

  const payload = (await response.json()) as {
    ok?: boolean;
    error?: string;
    result?: { stack?: [string, { bytes?: string }][] };
  };

  if (!payload.ok) {
    throw new Error(
      `runGetMethod error for ${ownerFriendly}: ${payload.error ?? "unknown"}`,
    );
  }

  const encoded = payload.result?.stack?.[0]?.[1]?.bytes;
  if (!encoded) {
    throw new Error(
      `Missing stack bytes when deriving wallet for ${ownerFriendly}`,
    );
  }

  const derived = Cell.fromBase64(encoded)
    .beginParse()
    .loadAddress()
    .toString();

  return derived;
}

async function main() {
  const mnemonic = process.env.TREASURY_MNEMONIC?.trim();

  if (!mnemonic) {
    throw new Error("Missing TREASURY_MNEMONIC environment variable");
  }

  const words = mnemonic.split(/\s+/);
  if (words.length !== 24) {
    throw new Error("TREASURY_MNEMONIC must contain 24 words");
  }

  const { data: metadata } = await axios.get(METADATA_URL, {
    timeout: 10_000,
  });
  console.log(
    `Jetton metadata verified for ${DOMAIN}:`,
    metadata.name,
    metadata.symbol,
  );

  const [stonfiWallet, dedustWallet] = await Promise.all([
    fetchJettonWallet(TON_MAINNET_STONFI_ROUTER),
    fetchJettonWallet(TON_MAINNET_DEDUST_DCT_TON_POOL),
  ]);

  if (stonfiWallet !== TON_MAINNET_STONFI_DCT_JETTON_WALLET) {
    throw new Error(
      `STON.fi jetton wallet mismatch: expected ${TON_MAINNET_STONFI_DCT_JETTON_WALLET} received ${stonfiWallet}`,
    );
  }

  if (dedustWallet !== TON_MAINNET_DEDUST_DCT_JETTON_WALLET) {
    throw new Error(
      `DeDust jetton wallet mismatch: expected ${TON_MAINNET_DEDUST_DCT_JETTON_WALLET} received ${dedustWallet}`,
    );
  }

  console.log("STON.fi jetton wallet verified:", stonfiWallet);
  console.log("DeDust jetton wallet verified:", dedustWallet);

  const keyPair = await mnemonicToPrivateKey(words);
  const pubkeyPreview = keyPair.publicKey.toString("hex").slice(0, 16);
  console.log(`Treasury pubkey: ${pubkeyPreview}...`);

  const payload = {
    ...dnsRecord,
    updated: new Date().toISOString(),
  } satisfies Record<string, string>;

  const message = Buffer.from(JSON.stringify(payload));
  const signature = sign(message, keyPair.secretKey).toString("base64");

  const signedRecord = {
    ...payload,
    signature,
  } satisfies Record<string, string>;

  console.log("\n✅ DNS RECORD SIGNED:\n");
  for (const [key, value] of Object.entries(signedRecord)) {
    console.log(`${key}=${value}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
