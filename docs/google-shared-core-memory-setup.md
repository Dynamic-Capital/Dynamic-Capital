# Google Shared Core Memory Setup

## Purpose

This guide explains how to configure a Google Drive shared drive as a "core
memory" hub for Dynamic Capital AI initiatives. It covers drive creation, access
control, folder standards, and automation patterns so Dynamic AI, AGI, AGS, and
research teams can use the same datasets, knowledge bases, and training
artifacts.

## Prerequisites

- Google Workspace account with permission to create shared drives.
- Organizational agreement on data retention and compliance policies.
- Identified stakeholders for AI research, engineering, governance, and
  security.
- Service account (optional) for programmatic access via APIs or `rclone`.

## Create the Shared Drive

1. Open Google Drive with an administrator account.
2. Navigate to **Shared drives** → **New**.
3. Name the drive `Dynamic Core Memory` (or follow existing naming schemes).
4. Assign at least two Content Managers to prevent accidental lockout.
5. Document the drive ID (found in the URL after `drive/folders/`). You will
   need it for API, Apps Script, and sync tooling.

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
- Mirror critical metadata (owners, update cadence, source system) in a
  `README.md` inside each folder.
- Store data dictionaries alongside datasets to accelerate onboarding.

## Access Roles and Permissions

- Grant **Manager** access only to AI program leads and security.
- Grant **Content Manager** to engineering teams responsible for pipelines.
- Grant **Contributor** to analysts, researchers, or contractors who upload
  data.
- Use **Viewer** or **Commenter** roles for downstream teams who only consume
  insights.
- Enable **Sharing restrictions** to block external resharing unless security
  approves.

### Configuration Matrix

Capture the approved principals and their roles in a machine-readable manifest
so audits and automation scripts can reconcile permissions. Store the file at
`00_admin/access-control.yaml` and update it during each review.

```yaml
drive:
  id: "<dynamic_core_memory_drive_id>"
  name: "Dynamic Core Memory"
roles:
  - name: manager
    description: "Program leads and security stewards"
    members:
      - group: ai-leads@dynamic.capital
      - user: ciso@dynamic.capital
  - name: content_manager
    description: "Pipeline owners with write/delete authority"
    members:
      - group: ml-eng@dynamic.capital
      - group: data-platform@dynamic.capital
  - name: contributor
    description: "Researchers uploading datasets and experiments"
    members:
      - group: research@dynamic.capital
  - name: viewer
    description: "Stakeholders consuming insights"
    members:
      - group: strategy@dynamic.capital
sharing_restrictions:
  allow_external_sharing: false
  require_domain: true
  block_download_for_viewers: true
review_cadence: quarterly
```

## Governance and Versioning

- Require every folder to contain a `CHANGELOG.md` summarizing notable additions
  or updates.
- Use Google Drive metadata (description field) to capture data classification
  (Public, Internal, Restricted).
- Schedule quarterly permission reviews and record them in
  `00_admin/access-reviews.md`.
- Pair large binary uploads with checksum manifests (`SHA256SUMS.txt`).

## Automation and Sync Options

### Google Drive for Desktop

- Install on shared workstations that need offline cache.
- Configure streaming mode to avoid excessive local storage usage.
- Map the `Dynamic Core Memory` drive to a fixed letter (Windows) or mount point
  (macOS) for script consistency.

### `rclone`

1. Create a service account in Google Cloud Console and delegate domain-wide
   authority if automation needs organization-wide access.
2. Share the shared drive with the service account.
3. Configure `rclone` with type `drive`, using the service account JSON and
   shared drive ID.
4. Schedule cron jobs for dataset mirroring, e.g.
   `rclone sync core-memory:20_datasets/curated s3:dynamic-core-memory/curated --checksum`.

Create a dedicated profile in `00_admin/rclone.conf` and check it into the
secure automation secrets vault (never into Git).

```ini
[core-memory]
type = drive
scope = drive
service_account_file = /opt/dynamic-core-memory/service-account.json
team_drive = <dynamic_core_memory_drive_id>
root_folder_id =
trashed_only = false
```

Automate the sync via cron on trusted runners:

```cron
0 2 * * * /usr/local/bin/rclone sync core-memory:20_datasets/curated s3:dynamic-core-memory/curated --checksum --max-transfer 200G --log-file /var/log/core-memory-rclone.log
```

### Apps Script and Drive API

- Build Apps Script triggers to label newly uploaded files, notify teams, or
  auto-route documents.
- Use Drive API batch operations to enforce naming conventions and remove
  orphaned files.

Sample Apps Script (`Code.gs`) that runs every 15 minutes, tags new files, and
normalizes permissions (enable the Drive advanced service first):

```javascript
const DRIVE_ID = "<dynamic_core_memory_drive_id>";

function processNewFiles() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000); // look back 15 minutes
  const files = DriveApp.getFolderById(DRIVE_ID)
    .searchFiles(`modifiedDate > '${cutoff.toISOString()}'`);

  while (files.hasNext()) {
    const file = files.next();
    file.setDescription(JSON.stringify(
      {
        "dc:lastReviewedBy": Session.getActiveUser().getEmail(),
        "dc:classification": "Internal",
      },
      null,
      2,
    ));

    Drive.Permissions.create({
      role: "commenter",
      type: "domain",
      allowFileDiscovery: false,
      domain: "dynamic.capital",
    }, file.getId());
  }
}

function installTrigger() {
  ScriptApp.newTrigger("processNewFiles")
    .timeBased()
    .everyMinutes(15)
    .create();
}
```

## Integrating with AI Pipelines

- Maintain a manifest (`30_models/deployment/manifest.json`) listing model
  versions, dataset hashes, and evaluation metrics.
- Sync training datasets to compute clusters via `rclone` or `gsutil` (if
  mirrored to Cloud Storage) before launching jobs.
- Store prompt templates and evaluation transcripts under
  `40_training_runs/prompts` and `40_training_runs/telemetry` to make
  reinforcement learning feedback auditable.
- Log ingestion jobs and dataset provenance in `20_datasets/README.md` for
  reproducibility.

## Security and Compliance

- Enforce Google Workspace data loss prevention (DLP) policies for the shared
  drive.
- Enable **Drive audit logs** and connect them to the SIEM for anomaly
  detection.
- Require two-factor authentication for all members and periodic security
  awareness training.
- Encrypt sensitive archives before uploading, using tools like `age` or `gpg`.

Maintain the following baseline configuration in
`00_admin/security-controls.yaml` to support automated checks:

```yaml
dlp:
  enabled: true
  rules:
    - name: "PII Upload Guard"
      severity: high
      action: quarantine
      pattern: "PERSONAL_IDENTIFIER"
    - name: "Secrets Detector"
      severity: critical
      action: block
      pattern: "(?i)(api[_-]?key|secret|token)"
audit_logging:
  siem_sink: "projects/dynamic-capital/logsink/core-memory"
  retention_days: 365
authentication:
  mfa_required: true
  session_duration_hours: 8
encryption:
  client_side_required: true
  approved_algorithms:
    - age
    - gpg
```

## Backup and Disaster Recovery

- Mirror the `90_archive/` folder to a separate cloud provider or on-premise
  storage weekly.
- Export drive metadata (permissions, file IDs) monthly via the Drive API for
  rebuild scenarios.
- Test restoration procedures quarterly by restoring a random dataset snapshot.

Document the backup workflow in `00_admin/backup-plan.yaml` so the operations
team can validate the configuration on every review cycle.

```yaml
backups:
  archive_mirror:
    target: "s3://dynamic-core-memory-archive"
    schedule: "weekly"
    retention_days: 180
  metadata_export:
    script: "gs://dynamic-core-memory-admin/export-drive-metadata.sh"
    schedule: "monthly"
    retention_days: 365
  disaster_recovery_test:
    cadence: "quarterly"
    scenario:
      - "Restore random dataset snapshot"
      - "Verify checksum integrity"
      - "Document findings in 00_admin/dr-test-log.md"
```

## Maintenance Checklist

- **Weekly:** Review upload queues, confirm dataset checksums, verify automation
  jobs succeeded.
- **Monthly:** Audit permissions, archive stale content, update manifests.
- **Quarterly:** Validate backup restores, refresh documentation, rotate service
  account keys.
- **Annually:** Reassess folder taxonomy against strategic initiatives,
  deprecate obsolete datasets, and update compliance mappings.

## Communication and Onboarding

- Publish this guide and the drive map in the internal knowledge base.
- Offer a 30-minute onboarding session for new collaborators covering access,
  naming conventions, and security expectations.
- Maintain a Q&A document inside `00_admin/faq.md` to capture institutional
  knowledge and reduce repeated questions.

## Next Steps

1. Secure leadership approval for the shared drive structure and policies.
2. Implement the shared drive and invite pilot teams.
3. Run a 2-week feedback loop, then refine folder structure and automations.
4. Expand access to the broader AI organization once governance practices are
   proven.
