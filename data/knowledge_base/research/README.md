# Research Knowledge Base Staging

This folder documents the research-oriented corpora that were recently added to
`OneDrive\\DynamicAI_DB\\knowledge_base\\research`. Use it as the control point
for mirroring the new material into the Dynamic Capital knowledge base.

## Source information

- **OneDrive path:** `OneDrive\\DynamicAI_DB\\knowledge_base\\research`
- **Supabase mirror (planned):** `public.one_drive_assets/knowledge_base/research/*`
- **Status:** Assets were uploaded to OneDrive and are awaiting checksum
  verification before being copied into Supabase cold storage.

## Mirroring checklist

1. Authenticate against the DynamicAI OneDrive tenant and navigate to the
   `knowledge_base/research` folder.
2. Download the latest dataset bundle(s) and record their filenames plus SHA-256
   checksums in `manifest.json` (create the file if it does not yet exist).
3. Store the raw archives in the Supabase bucket path noted above and extract
   text-forward assets into the RAG preprocessing pipeline.
4. Update the table below with a short description of each dataset so downstream
   teams can request the appropriate slices for their experiments.

## Dataset registry

| Dataset slug | Description | Notes |
| ------------ | ----------- | ----- |
| _TBD_        | Populate once the mirrored archives have been catalogued. | |

Keep this document in sync with the upstream OneDrive folder so that future
knowledge base drops reflect the new research materials.
