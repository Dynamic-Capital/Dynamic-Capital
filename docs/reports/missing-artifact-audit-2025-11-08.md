# Missing Artifact Audit – 2025-11-08

## Summary

- Reviewed prior workflow logs and knowledge base manifests to confirm that
  referenced artefacts are present in the repository.
- Cross-checked `.out/` workflow outputs and OneDrive metadata dumps referenced
  in runbooks and share guides; several expected files are not tracked.
- Flagged an additional dataset metadata file that is referenced in the trading
  runbook but absent from `data/`.

## Findings

### 1. Workflow outputs under `.out/`

The assets audit run log cites three generated outputs under `.out/`, but the
directory is missing from the repository.

- `.out/assets_audit_report.md`
- `.out/orphans.txt`
- `.out/removal_candidates_supabase_checked.txt`

**Evidence:**

- Referenced in the assets audit workflow
  recap.【F:docs/assets-audit-run-2025-10-07.md†L22-L26】
- `.out` does not exist at the repository root (attempting to list it
  fails).【6ba46a†L1-L2】

**Recommended action:** Re-run `scripts/cleanup/report.sh` and commit the
resulting `.out/` artefacts or add a note explaining where the outputs are
stored if they remain external.

### 2. OneDrive share metadata snapshots

Multiple share guides instruct contributors to persist metadata dumps alongside
the documentation, but only two `.metadata.json` files are present in
`docs/onedrive-shares/`.

| Missing artefact                                                                           | Referenced in                                                                                                                           |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/onedrive-shares/erbhfycq-folder.metadata.json`                                       | Research bundle share guide (instructions to dump metadata after authentication).【F:docs/onedrive-shares/erbhfycq-folder.md†L74-L108】 |
| `docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.metadata.json` | Knowledge-base books share workflow.【F:docs/onedrive-shares/ekqbarlpv7hljyb9tgpdmqcbzpxonb18k7rhjp2iv6ofmq-folder.md†L52-L76】         |
| `docs/onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.metadata.json` | External datasets mirror checklist.【F:docs/onedrive-shares/eu8_trb65jdbrll39t1gvwqbaiebw24rkuu17wcuk-c_qa-folder.md†L46-L70】          |
| `docs/onedrive-shares/eiqlwt1h9xpjk-7gpxzswqubhctetgb-e1khqcgjdyowjw-folder.metadata.json` | Additional PDF share metadata instructions.【F:docs/onedrive-shares/eiqlwt1h9xpjk-7gpxzswqubhctetgb-e1khqcgjdyowjw-folder.md†L30-L39】  |
| `docs/onedrive-shares/ejhj6-c4fjdopaw-phw5zl8bwumo2lyzhwbrhbknd4gvbq-folder.metadata.json` | Combined logs/models share guide.【F:docs/onedrive-shares/ejhj6-c4fjdopaw-phw5zl8bwumo2lyzhwbrhbknd4gvbq-folder.md†L28-L36】            |
| `docs/onedrive-shares/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa-folder.metadata.json` | Supabase dataset share runbook.【F:docs/onedrive-shares/epbjvzo1-p1llt5krgojiseb2gmb94px6ni1vpqhpktrfa-folder.md†L76-L123】             |
| `docs/onedrive-shares/eq5pnm_tcvdnggzwqer7mzubpqvlwljacc8dt8ike04u9a-folder.metadata.json` | PDF archive share checklist.【F:docs/onedrive-shares/eq5pnm_tcvdnggzwqer7mzubpqvlwljacc8dt8ike04u9a-folder.md†L28-L37】                 |
| `docs/onedrive-shares/eskwdphqepxihqmatzjdduubkm_lsdxt-jvm-1smjjgfea-folder.metadata.json` | Content expansion share instructions.【F:docs/onedrive-shares/eskwdphqepxihqmatzjdduubkm_lsdxt-jvm-1smjjgfea-folder.md†L28-L35】        |
| `docs/onedrive-shares/etoelnepqhhhiis2vl7qe_abz618nqf2vgnrykcx0prhwa-file.metadata.json`   | Single-file metadata capture guide.【F:docs/onedrive-shares/etoelnepqhhhiis2vl7qe_abz618nqf2vgnrykcx0prhwa-file.md†L29-L35】            |

Only `dynamic-ai-knowledge-base-hardening.metadata.json` and
`evlumlqt-folder.metadata.json` are currently checked into the folder,
confirming the other dumps have not been captured yet.【d1ec77†L1-L19】

**Recommended action:** Authenticate against each share and run
`tsx scripts/onedrive/dump-drive-item.ts` with the documented output paths so
that the metadata inventory stays in sync with the knowledge base manifests.

### 3. Trading dataset metadata

The trading operations runbook references `data/xauusd_snapshots.metadata.json`
as part of the ingestion workflow, but no matching metadata file exists under
`data/`.

- Referenced in the ingestion CLI example for the Lorentzian k-NN
  strategy.【F:docs/trading-runbook.md†L6-L31】
- `ls data` shows no `xauusd` metadata artefacts in the
  repository.【50cdfb†L1-L1】

**Recommended action:** Generate the metadata when running the backtest
collector (`--metadata data/xauusd_snapshots.metadata.json`) and commit it
alongside the CSV snapshot so downstream processes can rely on the documented
catalogue entry.

## Next Steps

1. Schedule time with the data operations team to authenticate against the
   pending OneDrive shares and capture the missing metadata dumps.
2. Add a validation step (script or CI check) that warns when `.metadata.json`
   targets referenced in documentation are absent to prevent drift.
3. Ensure workflow outputs intended for `.out/` are either checked in or
   archived with explicit pointers so future audits can confirm their
   availability.
