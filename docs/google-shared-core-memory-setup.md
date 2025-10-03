# Google Shared Core Memory Setup

## Purpose
This guide explains how to configure a Google Drive shared drive as a "core memory" hub for Dynamic Capital AI initiatives. It covers drive creation, access control, folder standards, and automation patterns so Dynamic AI, AGI, AGS, and research teams can use the same datasets, knowledge bases, and training artifacts.

## Prerequisites
- Google Workspace account with permission to create shared drives.
- Organizational agreement on data retention and compliance policies.
- Identified stakeholders for AI research, engineering, governance, and security.
- Service account (optional) for programmatic access via APIs or `rclone`.

## Create the Shared Drive
1. Open Google Drive with an administrator account.
2. Navigate to **Shared drives** → **New**.
3. Name the drive `Dynamic Core Memory` (or follow existing naming schemes).
4. Assign at least two Content Managers to prevent accidental lockout.
5. Document the drive ID (found in the URL after `drive/folders/`). You will need it for API, Apps Script, and sync tooling.

## Define Folder Topology
Organize the drive for cross-team clarity:

```
Dynamic Core Memory/
├── 00_admin/
├── 10_knowledge_base/
│   ├── ai_research/
│   ├── agi_architecture/
│   └── ags_playbooks/
├── 20_datasets/
│   ├── raw/
│   ├── curated/
│   └── synthetic/
├── 30_models/
│   ├── checkpoints/
│   ├── evaluations/
│   └── deployment/
├── 40_training_runs/
│   ├── prompts/
│   └── telemetry/
└── 90_archive/
```

- Use numeric prefixes to keep folders ordered and searchable.
- Mirror critical metadata (owners, update cadence, source system) in a `README.md` inside each folder.
- Store data dictionaries alongside datasets to accelerate onboarding.

## Access Roles and Permissions
- Grant **Manager** access only to AI program leads and security.
- Grant **Content Manager** to engineering teams responsible for pipelines.
- Grant **Contributor** to analysts, researchers, or contractors who upload data.
- Use **Viewer** or **Commenter** roles for downstream teams who only consume insights.
- Enable **Sharing restrictions** to block external resharing unless security approves.

## Governance and Versioning
- Require every folder to contain a `CHANGELOG.md` summarizing notable additions or updates.
- Use Google Drive metadata (description field) to capture data classification (Public, Internal, Restricted).
- Schedule quarterly permission reviews and record them in `00_admin/access-reviews.md`.
- Pair large binary uploads with checksum manifests (`SHA256SUMS.txt`).

## Automation and Sync Options
### Google Drive for Desktop
- Install on shared workstations that need offline cache.
- Configure streaming mode to avoid excessive local storage usage.
- Map the `Dynamic Core Memory` drive to a fixed letter (Windows) or mount point (macOS) for script consistency.

### `rclone`
1. Create a service account in Google Cloud Console and delegate domain-wide authority if automation needs organization-wide access.
2. Share the shared drive with the service account.
3. Configure `rclone` with type `drive`, using the service account JSON and shared drive ID.
4. Schedule cron jobs for dataset mirroring, e.g. `rclone sync core-memory:20_datasets/curated s3:dynamic-core-memory/curated --checksum`.

### Apps Script and Drive API
- Build Apps Script triggers to label newly uploaded files, notify teams, or auto-route documents.
- Use Drive API batch operations to enforce naming conventions and remove orphaned files.

## Integrating with AI Pipelines
- Maintain a manifest (`30_models/deployment/manifest.json`) listing model versions, dataset hashes, and evaluation metrics.
- Sync training datasets to compute clusters via `rclone` or `gsutil` (if mirrored to Cloud Storage) before launching jobs.
- Store prompt templates and evaluation transcripts under `40_training_runs/prompts` and `40_training_runs/telemetry` to make reinforcement learning feedback auditable.
- Log ingestion jobs and dataset provenance in `20_datasets/README.md` for reproducibility.

## Security and Compliance
- Enforce Google Workspace data loss prevention (DLP) policies for the shared drive.
- Enable **Drive audit logs** and connect them to the SIEM for anomaly detection.
- Require two-factor authentication for all members and periodic security awareness training.
- Encrypt sensitive archives before uploading, using tools like `age` or `gpg`.

## Backup and Disaster Recovery
- Mirror the `90_archive/` folder to a separate cloud provider or on-premise storage weekly.
- Export drive metadata (permissions, file IDs) monthly via the Drive API for rebuild scenarios.
- Test restoration procedures quarterly by restoring a random dataset snapshot.

## Maintenance Checklist
- **Weekly:** Review upload queues, confirm dataset checksums, verify automation jobs succeeded.
- **Monthly:** Audit permissions, archive stale content, update manifests.
- **Quarterly:** Validate backup restores, refresh documentation, rotate service account keys.
- **Annually:** Reassess folder taxonomy against strategic initiatives, deprecate obsolete datasets, and update compliance mappings.

## Communication and Onboarding
- Publish this guide and the drive map in the internal knowledge base.
- Offer a 30-minute onboarding session for new collaborators covering access, naming conventions, and security expectations.
- Maintain a Q&A document inside `00_admin/faq.md` to capture institutional knowledge and reduce repeated questions.

## Next Steps
1. Secure leadership approval for the shared drive structure and policies.
2. Implement the shared drive and invite pilot teams.
3. Run a 2-week feedback loop, then refine folder structure and automations.
4. Expand access to the broader AI organization once governance practices are proven.
