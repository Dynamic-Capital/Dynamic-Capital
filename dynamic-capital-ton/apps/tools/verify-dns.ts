import { mnemonicToPrivateKey, sign } from "ton-crypto";
import { TonClient4 } from "ton";
import axios from "axios";
import { Buffer } from "node:buffer";
import {
  TON_MAINNET_DCT_TREASURY_ALIAS,
  TON_MAINNET_DCT_TREASURY_WALLET,
  TON_MAINNET_DCT_WALLET_V5R1,
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_ROUTER,
} from "../../../shared/ton/mainnet-addresses";

const DOMAIN = "dynamiccapital.ton";
const METADATA_URL = "https://dynamiccapital.ton/jetton-metadata.json";
const RPC_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";
const dnsRecord: Record<string, string> = {
  ton_alias: TON_MAINNET_DCT_TREASURY_ALIAS,
  jetton_master: TON_MAINNET_JETTON_MASTER,
  treasury_wallet: TON_MAINNET_DCT_TREASURY_WALLET,
  stonfi_pool: TON_MAINNET_STONFI_ROUTER,
  wallet_v5r1: TON_MAINNET_DCT_WALLET_V5R1,
  dedust_pool: TON_MAINNET_DEDUST_DCT_TON_POOL,
  dao_contract: "EQDAOxyz...daoAddr",
  metadata: METADATA_URL,
  api: "https://api.dynamiccapital.ton",
  manifest: "https://dynamiccapital.ton/tonconnect-manifest.json",
  docs: "https://dynamiccapital.ton/docs",
};

async function main() {
  const mnemonic = process.env.TREASURY_MNEMONIC?.trim();

  if (!mnemonic) {
    throw new Error("Missing TREASURY_MNEMONIC environment variable");
  }

  const words = mnemonic.split(/\s+/);
  if (words.length !== 24) {
    throw new Error("TREASURY_MNEMONIC must contain 24 words");
  }

  const client = new TonClient4({ endpoint: RPC_ENDPOINT });
  const { last } = await client.getLastBlock();
  console.log(
    `Connected to TON RPC @ ${RPC_ENDPOINT}. Latest seqno: ${last.seqno}`,
  );

  const { data: metadata } = await axios.get(METADATA_URL, {
    timeout: 10_000,
  });
  console.log(
    `Jetton metadata verified for ${DOMAIN}:`,
    metadata.name,
    metadata.symbol,
  );

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
