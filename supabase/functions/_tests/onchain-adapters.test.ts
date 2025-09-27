import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  fetchCovalentBalances,
  fetchCovalentTransactions,
  fetchEthereumAccountSnapshot,
  fetchEthereumTransactions,
  fetchGlassnodeMetric,
  fetchMoralisBalance,
  fetchMoralisTransactions,
  fetchTonAccountSnapshot,
  fetchTonTransactions,
} from "../_shared/onchain/index.ts";
import { clearTestEnv, setTestEnv } from "./env-mock.ts";

denoTestTon();
denoTestEthereum();
denoTestCovalent();
denoTestMoralis();
denoTestGlassnode();

function denoTestTon() {
  Deno.test("ton adapters normalize balances and transactions", async () => {
    setTestEnv({ TON_API_BASE_URL: "https://ton.example/" });
    const requests: string[] = [];
    const responses = [
      new Response(
        JSON.stringify({
          balance: "1500000000",
          balance_usd: 6,
          updated_at: "2024-01-01T00:00:00Z",
        }),
        { status: 200 },
      ),
      new Response(
        JSON.stringify({
          items: [
            {
              hash: "0xabc",
              from: "ton-address",
              to: "receiver",
              value: 500000000,
              status: "success",
              block_time: "2024-01-01T00:05:00Z",
            },
          ],
        }),
        { status: 200 },
      ),
    ];
    globalThis.fetch = async (input: Request | string) => {
      const url = typeof input === "string" ? input : input.url;
      requests.push(url);
      const res = responses.shift();
      if (!res) return new Response("{}", { status: 404 });
      return res;
    };
    try {
      const snapshot = await fetchTonAccountSnapshot("ton-address");
      assertEquals(snapshot.balances.length, 1);
      assertEquals(snapshot.balances[0].amount, "1.5");
      const txs = await fetchTonTransactions("ton-address", { limit: 1 });
      assertEquals(txs.length, 1);
      assertEquals(txs[0].direction, "outbound");
      assert(requests[0].includes("accounts/ton-address"));
      assert(requests[1].includes("transactions"));
    } finally {
      clearTestEnv();
    }
  });
}

function denoTestEthereum() {
  Deno.test("etherscan adapter formats wei responses", async () => {
    setTestEnv({ ETHERSCAN_API_KEY: "test-key" });
    globalThis.fetch = async (input: Request | string) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      const action = url.searchParams.get("action");
      if (action === "balance") {
        return new Response(
          JSON.stringify({
            status: "1",
            message: "OK",
            result: "1230000000000000000",
          }),
          { status: 200 },
        );
      }
      if (action === "txlist") {
        return new Response(
          JSON.stringify({
            status: "1",
            message: "OK",
            result: [
              {
                hash: "0x1",
                from: "0xsender",
                to: "0xreceiver",
                value: "2100000000000000000",
                gasPrice: "20000000000",
                gasUsed: "21000",
                isError: "0",
                blockNumber: "100",
                timeStamp: "1700000000",
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    };
    try {
      const snapshot = await fetchEthereumAccountSnapshot("0xaddress");
      assertEquals(snapshot.balances[0].amount.startsWith("1.23"), true);
      const txs = await fetchEthereumTransactions("0xaddress", { offset: 10 });
      assertEquals(txs[0].fee !== undefined, true);
      assertEquals(txs[0].status, "confirmed");
    } finally {
      clearTestEnv();
    }
  });
}

function denoTestCovalent() {
  Deno.test("covalent adapter serializes token balances", async () => {
    setTestEnv({ COVALENT_API_KEY: "covalent-key" });
    globalThis.fetch = async (input: Request | string) => {
      const url = new URL(typeof input === "string" ? input : input.url);
      if (url.pathname.includes("balances_v2")) {
        return new Response(
          JSON.stringify({
            data: {
              items: [
                {
                  contract_address: "0xtoken",
                  contract_ticker_symbol: "ABC",
                  contract_decimals: 6,
                  balance: "1234500000",
                  quote: 42,
                },
              ],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          data: {
            items: [
              {
                tx_hash: "0xhash",
                from_address: "0xme",
                to_address: "0xyou",
                value: "100",
                success: true,
                block_signed_at: "2024-01-01T00:10:00Z",
              },
            ],
          },
        }),
        { status: 200 },
      );
    };
    try {
      const snapshot = await fetchCovalentBalances("eth-mainnet", "0xme");
      assertEquals(snapshot.balances[0].amount, "1234.5");
      const txs = await fetchCovalentTransactions("eth-mainnet", "0xme");
      assertEquals(txs[0].direction, "outbound");
    } finally {
      clearTestEnv();
    }
  });
}

function denoTestMoralis() {
  Deno.test("moralis adapter normalizes native balance", async () => {
    setTestEnv({ MORALIS_API_KEY: "moralis-key" });
    globalThis.fetch = async (input: Request | string) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/balance")) {
        return new Response(
          JSON.stringify({
            balance: "1000000000000000000",
            decimals: 18,
            symbol: "ETH",
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          result: [
            {
              hash: "0x2",
              from_address: "0xme",
              to_address: "0xyou",
              value: "500000000000000000",
              receipt_status: "1",
              block_timestamp: "2024-01-02T00:00:00Z",
            },
          ],
        }),
        { status: 200 },
      );
    };
    try {
      const snapshot = await fetchMoralisBalance("eth", "0xme");
      assertEquals(snapshot.balances[0].amount, "1");
      const txs = await fetchMoralisTransactions("eth", "0xme");
      assertEquals(txs[0].direction, "outbound");
    } finally {
      clearTestEnv();
    }
  });
}

function denoTestGlassnode() {
  Deno.test("glassnode adapter emits metric payloads", async () => {
    setTestEnv({ GLASSNODE_API_KEY: "glass-key" });
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          { t: 1700000000, v: 123.45, u: "btc", a: "BTC" },
        ]),
        { status: 200 },
      );
    try {
      const metrics = await fetchGlassnodeMetric("addresses/active", {
        asset: "BTC",
        interval: "24h",
      });
      assertEquals(metrics.length, 1);
      assertEquals(metrics[0].metric, "addresses/active");
      assertEquals(metrics[0].tags?.asset, "BTC");
    } finally {
      clearTestEnv();
    }
  });
}
