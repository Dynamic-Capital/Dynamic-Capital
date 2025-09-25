# TON Wallet Quickstart

This quickstart walks through creating a TON wallet programmatically using the
`@ton/ton` SDK. It demonstrates how to connect to a decentralized RPC endpoint,
generate a mnemonic, derive a key pair, instantiate a wallet contract, and fetch
its balance.

## Install dependencies

```bash
npm install @ton/ton @ton/crypto @orbs-network/ton-access
```

## Sample script

```ts
import { TonClient, WalletContractV4 } from "@ton/ton";
import { mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import { getHttpEndpoint } from "@orbs-network/ton-access";

async function main() {
  // Discover a community RPC endpoint
  const endpoint = await getHttpEndpoint();
  const client = new TonClient({ endpoint });

  // Generate a new wallet
  const mnemonics = await mnemonicNew();
  const keyPair = await mnemonicToPrivateKey(mnemonics);

  // Instantiate wallet contract on the base workchain (0)
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
  });
  const walletContract = client.open(wallet);

  // Query wallet balance (returns a bigint in nanotons)
  const balance = await walletContract.getBalance();

  console.log("Mnemonic:", mnemonics.join(" "));
  console.log("Address:", walletContract.address.toString());
  console.log("Balance:", balance.toString());
}

main().catch((error) => {
  console.error("Failed to create wallet", error);
  process.exit(1);
});
```

> **Note:** `WalletContractV4.create` expects an object with a `workchain`
> property. Passing a bare `0` will throw a syntax error. Use `workchain: 0` to
> target the base chain.
