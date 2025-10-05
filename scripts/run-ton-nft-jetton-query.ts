import { newDb } from "pg-mem";

const DEFAULT_COLLECTION_ADDRESS =
  "EQDvRFMYLdxmvY3Tk-cfWMLqDnXF_EclO2Fp4wwj33WhlNFT";
const DEFAULT_JETTON_ADDRESS =
  "EQCcLAW537KnRg_aSPrnQJoyYjOZkzqYp6FVmRUvN1crSazV";

type WalletRow = {
  human_readable: string;
};

function parseArguments(): {
  collectionAddress: string;
  jettonAddress: string;
} {
  const [collectionAddress, jettonAddress] = process.argv.slice(2);
  return {
    collectionAddress: collectionAddress ?? DEFAULT_COLLECTION_ADDRESS,
    jettonAddress: jettonAddress ?? DEFAULT_JETTON_ADDRESS,
  };
}

function isWalletRow(value: unknown): value is WalletRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "human_readable" in value &&
    typeof (value as { human_readable: unknown }).human_readable === "string"
  );
}

async function seedDatabase(collectionAddress: string, jettonAddress: string) {
  const db = newDb();
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();

  await client.query("CREATE SCHEMA blockchain;");
  await client.query("CREATE SCHEMA getmethods;");

  await client.query(`
    CREATE TABLE blockchain.accounts (
      id BIGINT PRIMARY KEY,
      human_readable TEXT NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE getmethods.get_nft_data (
      owner_account_id BIGINT NOT NULL,
      collection_account_id BIGINT NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE getmethods.get_wallet_data (
      owner_account_id BIGINT NOT NULL,
      jetton_account_id BIGINT NOT NULL
    );
  `);

  const accounts: Array<{ id: number; humanReadable: string }> = [
    { id: 1, humanReadable: collectionAddress },
    { id: 2, humanReadable: jettonAddress },
    {
      id: 101,
      humanReadable: "EQExampleWallet11111111111111111111111111111111",
    },
    {
      id: 102,
      humanReadable: "EQExampleWallet22222222222222222222222222222222",
    },
    {
      id: 103,
      humanReadable: "EQExampleWallet33333333333333333333333333333333",
    },
  ];

  for (const account of accounts) {
    await client.query(
      `INSERT INTO blockchain.accounts (id, human_readable) VALUES ($1, $2);`,
      [account.id, account.humanReadable],
    );
  }

  const nftRows: Array<{ owner: number; collection: number }> = [
    { owner: 101, collection: 1 },
    { owner: 102, collection: 1 },
    { owner: 103, collection: 999 },
  ];

  for (const row of nftRows) {
    await client.query(
      `INSERT INTO getmethods.get_nft_data (owner_account_id, collection_account_id) VALUES ($1, $2);`,
      [row.owner, row.collection],
    );
  }

  const jettonRows: Array<{ owner: number; jetton: number }> = [
    { owner: 101, jetton: 2 },
    { owner: 102, jetton: 2 },
    { owner: 103, jetton: 555 },
  ];

  for (const row of jettonRows) {
    await client.query(
      `INSERT INTO getmethods.get_wallet_data (owner_account_id, jetton_account_id) VALUES ($1, $2);`,
      [row.owner, row.jetton],
    );
  }

  return client;
}

async function runQuery() {
  const { collectionAddress, jettonAddress } = parseArguments();
  const client = await seedDatabase(collectionAddress, jettonAddress);

  const query = `
    SELECT a.human_readable
    FROM blockchain.accounts AS a
    JOIN (
      SELECT DISTINCT nft.owner_account_id
      FROM getmethods.get_nft_data AS nft
      JOIN getmethods.get_wallet_data AS jetton
        ON jetton.owner_account_id = nft.owner_account_id
      WHERE nft.collection_account_id = (
        SELECT id
        FROM blockchain.accounts
        WHERE human_readable = $1
      )
        AND jetton.jetton_account_id = (
          SELECT id
          FROM blockchain.accounts
          WHERE human_readable = $2
        )
    ) AS t ON a.id = t.owner_account_id
    ORDER BY a.human_readable;
  `;

  const result = await client.query(query, [collectionAddress, jettonAddress]);

  const wallets = result.rows.filter(isWalletRow).map((row) =>
    row.human_readable
  );

  if (wallets.length === 0) {
    console.log(
      "No wallets matched the provided NFT collection and jetton addresses.",
    );
  } else {
    console.log("Wallets holding both the NFT collection and jetton:");
    for (const wallet of wallets) {
      console.log(`- ${wallet}`);
    }
  }

  await client.end();
}

runQuery().catch((error) => {
  console.error("Failed to execute TON NFT and jetton ownership query:", error);
  process.exit(1);
});
