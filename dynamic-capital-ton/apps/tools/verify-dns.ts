import axios from "axios";
import { Buffer } from "node:buffer";
import { Address, Cell, beginCell } from "@ton/core";
import { mnemonicToPrivateKey, sign } from "ton-crypto";
import {
  TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
  TON_MAINNET_DEDUST_DCT_TON_POOL,
  TON_MAINNET_DAO_MULTISIG,
  TON_MAINNET_DCT_TREASURY_ALIAS,
  TON_MAINNET_DCT_TREASURY_WALLET,
  TON_MAINNET_DCT_WALLET_V5R1,
  TON_MAINNET_JETTON_MASTER,
  TON_MAINNET_STONFI_DCT_JETTON_WALLET,
  TON_MAINNET_STONFI_DCT_TON_POOL,
  TON_MAINNET_STONFI_ROUTER,
  TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
  TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
} from "../../../shared/ton/mainnet-addresses";
import { DCT_DEX_POOLS } from "../../../shared/ton/dct-liquidity";

type JettonMetadata = {
  readonly name?: string;
  readonly symbol?: string;
};

const DOMAIN = "dynamiccapital.ton";
const METADATA_URL = "https://dynamiccapital.ton/jetton-metadata.json";
const RPC_ENDPOINT = "https://toncenter.com/api/v2/jsonRPC";
const TON_VIEWER_JETTON_URL =
  `https://tonviewer.com/jetton/${TON_MAINNET_JETTON_MASTER}`;
const TONSCAN_JETTON_URL =
  `https://tonscan.org/jetton/${TON_MAINNET_JETTON_MASTER}`;
const DYOR_JETTON_URL = `https://dyor.io/token/${TON_MAINNET_JETTON_MASTER}`;
const TONCOIN_EXPLORER_JETTON_URL =
  `https://explorer.toncoin.org/account?account=${TON_MAINNET_JETTON_MASTER}`;
const TONCX_EXPLORER_JETTON_URL =
  `https://ton.cx/address/${TON_MAINNET_JETTON_MASTER}`;
const DEX_SCREENER_TOKEN_URL =
  `https://dexscreener.com/ton/${TON_MAINNET_JETTON_MASTER}`;
const X1000_TOKEN_URL =
  `https://x1000.finance/tokens/${TON_MAINNET_JETTON_MASTER}`;

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

  const { data: metadata } = await axios.get<JettonMetadata>(METADATA_URL, {
    timeout: 10_000,
  });

  if (!metadata || typeof metadata.symbol !== "string" || metadata.symbol.trim() === "") {
    throw new Error("Jetton metadata is missing the token symbol");
  }

  if (metadata.symbol !== "DCT") {
    throw new Error(
      `Jetton metadata symbol mismatch: expected DCT received ${metadata.symbol}`,
    );
  }

  if (!metadata.name || metadata.name.trim() === "") {
    throw new Error("Jetton metadata is missing the token name");
  }

  console.log(
    `Jetton metadata verified for ${DOMAIN}:`,
    metadata.name,
    metadata.symbol,
  );

  const stonfiPool = DCT_DEX_POOLS.find((pool) => pool.dex === "STON.fi");
  const dedustPool = DCT_DEX_POOLS.find((pool) => pool.dex === "DeDust");
  const swapcoffeePool = DCT_DEX_POOLS.find(
    (pool) => pool.dex === "swap.coffee",
  );

  if (!stonfiPool || !stonfiPool.metadataUrl || !stonfiPool.dexScreenerPairUrl) {
    throw new Error("Missing STON.fi pool metadata configuration");
  }

  if (!dedustPool || !dedustPool.metadataUrl || !dedustPool.dexScreenerPairUrl) {
    throw new Error("Missing DeDust pool metadata configuration");
  }

  if (!swapcoffeePool || !swapcoffeePool.metadataUrl) {
    throw new Error("Missing swap.coffee pool metadata configuration");
  }

  const dnsRecord: Record<string, string> = {
    ton_alias: TON_MAINNET_DCT_TREASURY_ALIAS,
    root_wallet: TON_MAINNET_DAO_MULTISIG,
    token_symbol: metadata.symbol,
    jetton_master: TON_MAINNET_JETTON_MASTER,
    treasury_wallet: TON_MAINNET_DCT_TREASURY_WALLET,
    wallet_v5r1: TON_MAINNET_DCT_WALLET_V5R1,
    jetton_tonviewer: TON_VIEWER_JETTON_URL,
    jetton_tonscan: TONSCAN_JETTON_URL,
    jetton_dyor: DYOR_JETTON_URL,
    jetton_toncoin: TONCOIN_EXPLORER_JETTON_URL,
    jetton_toncx: TONCX_EXPLORER_JETTON_URL,
    dao_contract: TON_MAINNET_DAO_MULTISIG,
    metadata: METADATA_URL,
    metadata_fallback: "https://dynamic.capital/jetton-metadata.json",
    api: "https://api.dynamiccapital.ton",
    api_fallback: "https://dynamic.capital/api",
    manifest: "https://dynamiccapital.ton/tonconnect-manifest.json",
    manifest_fallback: "https://dynamic.capital/tonconnect-manifest.json",
    docs: "https://dynamiccapital.ton/docs",
    docs_fallback: "https://dynamic.capital/docs",
    dexscreener_token: DEX_SCREENER_TOKEN_URL,
    x1000_token: X1000_TOKEN_URL,
  };

  for (const pool of DCT_DEX_POOLS) {
    const slug = pool.dex.toLowerCase().replace(/[^a-z0-9]/g, "");
    dnsRecord[`${slug}_pool`] = pool.poolAddress;
    if (pool.metadataUrl) {
      dnsRecord[`${slug}_pool_metadata`] = pool.metadataUrl;
    }
    dnsRecord[`${slug}_jetton_wallet`] = pool.jettonWalletAddress;
    dnsRecord[`${slug}_swap`] = pool.swapUrl;
    if (pool.dexScreenerPairUrl) {
      dnsRecord[`dexscreener_${slug}`] = pool.dexScreenerPairUrl;
    }
    if (pool.geckoTerminalPoolUrl) {
      dnsRecord[`geckoterminal_${slug}`] = pool.geckoTerminalPoolUrl;
    }
  }

  const walletExpectations = [
    {
      dex: "STON.fi",
      owner: TON_MAINNET_STONFI_ROUTER,
      expected: TON_MAINNET_STONFI_DCT_JETTON_WALLET,
    },
    {
      dex: "DeDust",
      owner: TON_MAINNET_DEDUST_DCT_TON_POOL,
      expected: TON_MAINNET_DEDUST_DCT_JETTON_WALLET,
    },
    {
      dex: "swap.coffee",
      owner: TON_MAINNET_SWAPCOFFEE_DCT_TON_POOL,
      expected: TON_MAINNET_SWAPCOFFEE_DCT_JETTON_WALLET,
    },
  ] as const;

  const derivedWallets = await Promise.all(
    walletExpectations.map(({ owner }) => fetchJettonWallet(owner)),
  );

  walletExpectations.forEach(({ dex, expected }, index) => {
    const derived = derivedWallets[index];
    if (derived !== expected) {
      throw new Error(
        `${dex} jetton wallet mismatch: expected ${expected} received ${derived}`,
      );
    }
    console.log(`${dex} jetton wallet verified:`, derived);
  });

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
