import { mnemonicToPrivateKey, sign } from "ton-crypto";
import { TonClient4 } from "ton";
import axios from "axios";
import { Buffer } from "node:buffer";

const DOMAIN = "dynamiccapital.ton";
const METADATA_URL = "https://dynamiccapital.ton/jetton-metadata.json";
const RPC_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";
const dnsRecord: Record<string, string> = {
  jetton_master: "EQDSmz4R...ig6Wx_6y",
  treasury_wallet: "UQD1zAJP...H_cNOK0G",
  stonfi_pool: "EQAyD7O8...5lfJPyfA",
  wallet_v5r1: "EQDTJ4lHuT6BdTYEio99UMZNC9hzlQ-TfoA9THrvyrLumEFm",
  dedust_pool: "EQAxh2vD3UMfNrF29pKl6WsOzxrt6_p2SXrNLzZh1vus0_MI",
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
