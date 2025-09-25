# TON allocator webhook

This Supabase Edge Function ingests `TonPoolAllocator` deposit events. The
allocator emits the following payload once a wrapped USDT jetton transfer is
swapped into DCT:

```jsonc
{
  "event": {
    "depositId": "123",
    "investorKey": "0:abcdef...",
    "usdtAmount": 1000.0,
    "dctAmount": 950.123456789,
    "fxRate": 1.052631,
    "tonTxHash": "4b3f...",
    "valuationUsdt": 1000.0
  },
  "proof": {
    "blockId": "-239048:2:abcdef",
    "shardProof": "boc://...",
    "signature": "0x1234...",
    "routerTxHash": "8ac1..."
  },
  "observedAt": "2025-10-15T08:30:00.000Z"
}
```

The allocator signs the raw JSON with an HMAC SHA-256 signature, delivered in
the `x-allocator-signature` header. Configure `TON_ALLOCATOR_WEBHOOK_SECRET` in
the Supabase environment to match the signing key shared with the on-chain
indexer.

Upon verification the function writes to `ton_pool_events`, storing the raw
payloads for auditors and triggering the `notify_ton_pool_event` RPC so the web
app can update investor balances in real time.
