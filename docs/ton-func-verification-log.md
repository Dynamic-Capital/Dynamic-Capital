# TON FunC Verification Log

The FunC verification workflow compiles the Dynamic Capital FunC contracts and
compares their code cell hashes against the on-chain deployments. Use the
automation to keep an auditable trail of verification runs.

## Automation command

```sh
npm run ton:verify-func-mainnet
```

The command compiles
`dynamic-capital-ton/contracts/jetton/discoverable/master.fc` with
`@ton-community/func-js`, fetches the published code cell from Toncenter, and
stores the comparison in `data/ton_func_mainnet_verification_report.json`.

## Latest verification snapshot

| Run at (UTC)        | Network | Contract            | Address                                          | Local hash                                                       | On-chain hash                                                    | Match |
| ------------------- | ------- | ------------------- | ------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ----- |
| 2025-10-12 01:52:33 | mainnet | discoverable_master | EQDSmz4RrDBFG-T1izwVJ7q1dpAq1mJTLrKwyMYJig6Wx_6y | 16492fd272ef46b017a717f495e89e1ef360785ed0abda91a04e64640ff09b15 | 9a0f98dd6fbf225eef8165e4e64417ee931f7eea000653439e7b5dcdc0644cd6 | ❌    |

## Follow-up

- Investigate the code hash mismatch between the compiled discoverable master
  contract and the live deployment. Confirm whether the on-chain version is
  running an older build or if the local sources have diverged.
- Capture the remediation (redeploy, update docs, or align sources) in this log
  after the next verification run.
