# Dynamic Multi-Platform Data Architecture Strategy

## Dynamic Core Organization Principle

**Single Source of Truth + Distributed Mirrors**

- Select one platform to act as the canonical reference point for code, data
  definitions, configuration, and documentation.
- Treat every other integration as a synchronized mirror or a specialized
  delivery surface that can be rebuilt deterministically from the primary
  source.

## Recommended Architecture

### Primary Source of Truth: GitHub

GitHub centralizes version control, collaborative review, and automated
workflows. Use it to own the repository of record for:

- Source code
- DVC metafiles and pointers
- Configuration for every downstream platform
- Documentation and operational runbooks

```
ai-project/
├── .github/workflows/          # CI/CD automation
├── data/                       # DVC-tracked datasets
├── models/                     # DVC-tracked models
├── src/                        # Source code
├── notebooks/                  # Experimental work
├── config/                     # Platform configurations
├── docs/                       # Documentation
└── dvc.yaml                    # Data pipeline
```

### Repository Implementation Files

The repository now bundles runnable assets that encode this architecture end to
end:

- `.github/workflows/sync-multi-platform.yml` – runs the synchronization
  pipeline on every push to `main`, via a nightly cron, or on demand through the
  Actions UI.
- `config/platforms.example.yaml` – configuration template. Copy it to
  `config/platforms.yaml` and provide platform-specific credentials or
  identifiers outside of version control.
- `scripts/sync/cross-platform-sync.ts` – orchestrator that hashes datasets,
  fans out to each platform handler, and persists metadata registries.
- `supabase/metadata/datasets.json` – local registry mirroring Supabase’s
  dataset table schema for deterministic metadata updates.
- `dynamic-capital-ton/provenance/datasets.json` – local ledger for TON
  provenance proofs before broadcasting hashes on-chain.

### Multi-Platform Sync Strategy

Automate synchronization from GitHub to every other platform to guarantee
consistency. Each integration should be declarative and driven by configuration
so that the sync process is repeatable.

#### 1. GitHub (Source of Truth)

```yaml
# .github/workflows/sync-multi-platform.yml
name: Cross Platform Dataset Sync

on:
  workflow_dispatch:
  schedule:
    - cron: "0 2 * * *"
  push:
    branches:
      - main

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Use Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Prepare sync configuration
        run: |
          if [ ! -f config/platforms.yaml ]; then
            cp config/platforms.example.yaml config/platforms.yaml
          fi

      - name: Dry-run dataset sync orchestration
        env:
          SYNC_VERSION: ${{ github.sha }}
        run: |
          npx tsx scripts/sync/cross-platform-sync.ts \
            --dataset data/books_drive_metadata.json \
            --version "${SYNC_VERSION}" \
            --dry-run
```

#### 2. Google Drive

- **Purpose:** Human-friendly access and collaboration with non-technical teams.
- **Structure:**

```
AI Project/
├── 📊 Reports & Analysis/
│   ├── 2024-07-15_model-performance/
│   └── 2024-07-20-data-quality/
├── 🗃️ Datasets/
│   ├── current/ -> (symlink to latest versions)
│   ├── archive/
│   └── external/
├── 🚀 Models/
│   ├── production/
│   └── experimental/
└── 📋 Documentation/
```

#### 3. Supabase

Supabase delivers structured metadata, authenticated APIs, and role-based access
controls.

```sql
-- Dataset registry
CREATE TABLE datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    description TEXT,
    file_path VARCHAR(500),
    platform_locations JSONB, -- {github: ..., gdrive: ..., do: ...}
    created_at TIMESTAMP DEFAULT NOW(),
    checksum VARCHAR(64),
    size_bytes BIGINT,
    tags VARCHAR[],
    is_public BOOLEAN DEFAULT false
);

-- Model registry
CREATE TABLE models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    dataset_id UUID REFERENCES datasets(id),
    performance_metrics JSONB,
    deployment_locations JSONB, -- {vercel: ..., digitalocean: ...}
    created_at TIMESTAMP DEFAULT NOW()
);

-- Experiment tracking
CREATE TABLE experiments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255),
    dataset_version VARCHAR(50),
    model_version VARCHAR(50),
    parameters JSONB,
    results JSONB,
    git_commit VARCHAR(40)
);
```

#### 4. Digital Ocean Spaces

- **Purpose:** High-performance object storage for datasets and models.
- **Structure:**

```
ai-project/
├── datasets/
│   ├── v1/
│   ├── v2/
│   └── latest/ -> v2/
├── models/
│   ├── production/
│   ├── staging/
│   └── archive/
└── backups/
    └── 2024-07-20/
```

#### 5. Vercel

- **Purpose:** Frontend hosting, API endpoints, and model inference surfaces.
- **Structure:**

```
vercel-app/
├── api/
│   ├── predict/
│   ├── datasets/
│   └── models/
├── public/
│   └── model-artifacts/  # Small, cached artifacts
└── lib/
    └── supabase.js       # Supabase client
```

#### 6. TON Network

Leverage the TON blockchain for decentralized attestation of dataset hashes,
model provenance, and immutable audit trails.

## Cross-Platform File Naming Convention

Use a universal file naming template to guarantee deterministic discovery and
traceability across every platform:

```
[project]_[entity]_[version]_[timestamp]_[platform-hint].[extension]
```

### Examples

- `sentiment-ai_dataset_v2.3_20240720_do.parquet`
- `sentiment-ai_model_bert-base_20240720_vercel.onnx`
- `sentiment-ai_config_dataset-mapping_20240720_supabase.json`

### Platform-Specific Adaptations

#### GitHub (DVC Tracked)

```bash
# .dvc files
data/raw/sentiment-dataset_v1.0_20240720.dvc
models/bert/sentiment-model_v2.1_20240720.dvc
```

#### Supabase (Metadata)

```sql
INSERT INTO datasets (name, version, platform_locations) 
VALUES (
  'sentiment-dataset',
  'v1.0_20240720',
  '{
    "github": "data/raw/sentiment-dataset_v1.0_20240720.parquet",
    "gdrive": "AI Project/Datasets/sentiment-dataset_v1.0_20240720.parquet", 
    "digitalocean": "ai-project/datasets/v1/sentiment-dataset_v1.0_20240720.parquet"
  }'
);
```

## Automated Sync Scripts

### Centralized Sync Controller

```bash
npx tsx scripts/sync/cross-platform-sync.ts \
  --dataset data/books_drive_metadata.json \
  --version 2024.07.20 \
  --platforms github,digitalocean,gdrive,vercel,ton,supabase
```

Key behaviours:

1. **Metadata hashing** – computes deterministic SHA-256 hashes plus size and
   file-count metrics for either single files or directories.
2. **Platform handlers** – orchestrates purpose-built handlers for GitHub
   validation, DigitalOcean Spaces uploads (via AWS CLI), Google Drive syncs
   (`rclone`), Vercel dataset routing, TON provenance, and Supabase registry
   updates. Dry runs skip remote mutations but still validate configuration.
3. **Location registry** – merges remote artifact URLs or identifiers and writes
   them to `supabase/metadata/datasets.json`, including checksum, file counts,
   and an `is_directory` flag for Supabase ingestion and audit trails.
4. **Provenance proofs** – maintains a local ledger in
   `dynamic-capital-ton/provenance/datasets.json` before optionally committing
   hashes to the TON blockchain.

### Platform Configuration Manager

```yaml
# config/platforms.example.yaml
platforms:
  github:
    repo: "your-username/ai-project"
    branch: "main"
    data_root: "data"

  digitalocean:
    space: "ai-project"
    region: "nyc3"
    prefix: "datasets"
    profile: "do-spaces"
    cdn_base_url: "https://ai-project.nyc3.digitaloceanspaces.com"

  gdrive:
    remote: "gdrive"
    base_folder: "AI Project/Datasets"

  supabase:
    metadata_file: "supabase/metadata/datasets.json"

  vercel:
    dataset_api_base: "https://your-vercel-app.vercel.app/api/datasets"

  ton:
    registry_file: "dynamic-capital-ton/provenance/datasets.json"
    network: "mainnet"
```

## Vercel API Integration

```javascript
// pages/api/datasets/[id].js
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );

  const { id } = req.query;

  // Get dataset metadata from Supabase
  const { data: dataset, error } = await supabase
    .from("datasets")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return res.status(400).json({ error });

  // Return appropriate download URL based on platform
  const downloadUrl = getOptimalDownloadUrl(dataset.platform_locations);

  res.json({ dataset, downloadUrl });
}

function getOptimalDownloadUrl(locations) {
  // Logic to choose best platform for download
  if (locations.digitalocean) return locations.digitalocean;
  if (locations.github) return locations.github;
  return locations.gdrive;
}
```

## Benefits of the Architecture

1. **GitHub as Source of Truth** – robust version control, collaboration, and
   CI/CD.
2. **Google Drive for Accessibility** – empowers non-technical contributors.
3. **Supabase for Structure** – metadata, APIs, and user management.
4. **Digital Ocean for Performance** – high-speed data and model serving.
5. **Vercel for Deployment** – managed frontend and API delivery.
6. **TON for Decentralization** – cryptographic provenance and verification.

Together these integrations deliver centralized governance with distributed
availability, ensuring that every platform reflects the same authoritative state
while playing to its strengths.
