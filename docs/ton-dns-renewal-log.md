# TON DNS Renewal Log

Operational log capturing renewal and balance management actions for Dynamic
Capital's `.ton` domains.

## 2025-09-30 — `dynamiccapital.ton` AuctionFillUp

- **Event ID:**
  `96ac854938b992f71f33827dac42a7aa9e302539fc55347e006f6eee74dc0d89`
- **On-chain timestamp:** 2025-09-30 19:33:05 UTC
- **Contract call:** `.ton DNS` `AuctionFillUp`
- **Domain NFT:**
  `0:038f473650b2d1641bd09563eb8c99f1e84e5c72eb0fb8fdc534a4430f14c1b5`
- **Primary wallet:** `dynamiccapital.ton`
- **Base transactions:**
  - `d829586188e485a86cdb87e158cba478be555e3dfe2d1420ededbbdfd7f1f1b8`
  - `5138a51a870cae0cada7f468866457d67d87878aeab50e9542045c91d6781644`
  - `1c82a54ec8f75a1abbf56f3896b21b04c0f3047fddffba1edb8dd19da75651ac`
  - `99a714393bb56d833165654ff181c85bfd8c968909883263bb698d5bd224ab85`
  - `dc7f1caa7f2ea9b56e046a53cc5fefb6d05c355180fdc955fd15bf61a95c7228`

### Action summary

| Action                | Participants                                | Amount (TON) | Notes                                                                                                 |
| --------------------- | ------------------------------------------- | -----------: | ----------------------------------------------------------------------------------------------------- |
| Gas relay             | TONAPI gas proxy → `dynamiccapital.ton`     |   0.06614679 | Relayer covered execution gas, 0.006141306 TON consumed in fees.                                      |
| NFT internal transfer | `dynamiccapital.ton` → `dynamiccapital.ton` |        1 NFT | Domain NFT cycled internally as part of the fill-up workflow.                                         |
| Auction fill-up       | NFT executor → `.ton DNS`                   |  0.024698749 | Balance deposited to extend domain validity; `.ton DNS` contract retained 0.024137527 TON after fees. |
| Tonkeeper rebate      | Tonkeeper battery → relayer                 |  0.062119309 | Wallet battery reimbursed the relayer for net gas spend.                                              |

### Value flow (net of fees)

| Account                      |        TON Δ |  Fees (TON) |
| ---------------------------- | -----------: | ----------: |
| TONAPI gas proxy             | −0.072288096 | 0.006141306 |
| `dynamiccapital.ton` wallet  |  0.000100016 | 0.002833718 |
| NFT executor (`0:038f…c1b5`) | −0.030841529 | 0.007072922 |
| `.ton DNS` contract          |  0.024137527 | 0.000561222 |
| Tonkeeper battery            |  0.062119309 | 0.000163605 |

### Follow-up actions

- Confirm the resolver balance increase inside the TON DNS Manager UI and
  capture a screenshot for the next infrastructure review packet.
- Update treasury worksheets with the 0.024137527 TON spend attributed to domain
  renewals.
- Monitor the `get_last_fill_up_time` getter to verify it reflects the September
  2025 top-up and schedule the next renewal reminder 11 months out.
