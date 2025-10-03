# Dhivehi Language Processing Playbook

## Overview

This playbook distills the Dhivehi-focused open-source projects you referenced
into a Dhivehi-first customer support experience for Dynamic Capital. The
optimized use case is an end-to-end bilingual assistance loop—spanning intake,
translation, speech, and knowledge retrieval—that keeps Dhivehi speakers on par
with English-first users. All phases below ladder back to that single journey,
so the same assets (keyboards, glossaries, corpora) compound value instead of
being scattered across unrelated pilots.

### Primary Use Case: Dhivehi Customer Support Co-Pilot

1. **Capture** – Agents and customers type or dictate in either Latin or Thaana
   scripts; utilities normalize inputs and surface consistent Dhivehi phrasing.
2. **Translate** – Requests flow through a Dhivehi ⇄ English translation memory
   with guardrails before hitting automation or human reviewers.
3. **Resolve** – Retrieval-augmented agents surface Dhivehi knowledge base
   answers, Quran-informed compliance guidance, or financial calculators in the
   requester's language.
4. **Learn** – Feedback loops and evaluation datasets strengthen translation
   quality, speech recognition, and glossary coverage every sprint.

## Objectives

1. **Agent Productivity** – Give customer support the tools to read, respond,
   and summarize Dhivehi issues without context switching into external apps.
2. **Accurate Bidirectional Translation** – Deliver Dhivehi ⇄ English answers
   with guardrails and human feedback loops tuned to fintech terminology.
3. **Authoring & Input Experience** – Equip support portals, CRM editors, and
   chat surfaces with reliable Thaana text entry, transliteration, and
   formatting.
4. **Speech & Multimodal Coverage** – Capture Dhivehi voice notes and hotline
   calls, producing searchable transcripts that feed the same support queues.
5. **Knowledge Preservation** – Structure Dhivehi lexical resources (Radheef,
   Quran translation) for retrieval, enrichment, and QA inside the co-pilot.
6. **Model Adaptation** – Fine-tune foundational LLMs and speech models with
   Dhivehi corpora while keeping evaluation guardrails tight.

## Reference Projects & Roles

| Capability Track       | Repository                          | Co-Pilot Contribution                                                      |
| ---------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| Thaana Input           | `aharen/thaana-keyboard`            | Normalizes customer queries in helpdesk widgets and agent consoles.        |
| Laravel Localization   | `Javaabu/laravel-dhivehi-translate` | Accelerates Dhivehi UI for back-office tools that surface support cases.   |
| WordPress Localization | `Javaabu/wpml-dhivehi-extension`    | Powers Dhivehi FAQs and knowledge base entries linked inside chat replies. |
| Lexical Resources      | `kudanai/osx_radheef`               | Supplies morphological hints to translation QA and glossary lookups.       |
| Numeric Formatting     | `dhivehi/DhivehiMVR_excel`          | Keeps financial answers (invoices, repayments) localized and consistent.   |
| LLM Adaptation         | `HassanIyan/Alpaca-dhivehi`         | Provides Dhivehi-specialized response suggestions for agents.              |
| Speech Processing      | `beneyraheem/thaanaSTT`             | Converts hotline recordings into ticket summaries and searchable snippets. |
| Religious Corpus       | `kudanai/Quran-Translation`         | Anchors compliance and ethics responses with authoritative references.     |

## Phase 1 – Foundations (Weeks 1–4)

Lay the groundwork inside support tooling so Dhivehi conversations feel native
from the very first ticket.

### 1. Thaana Input Toolkit

- Fork `aharen/thaana-keyboard` and wrap it as a reusable React component for
  our front-end apps, embedding it in helpdesk ticket composers and CRM note
  fields.
- Add unit tests covering transliteration edge cases (digits, punctuation,
  ligatures) before bundling into npm workspace packages.
- Provide progressive enhancement: auto-detect OS language support and fall back
  to on-screen keyboard.
- Seed the shared utilities workspace with transliteration helpers
  (`tools/dhivehi/transliteration.ts`) so Storybook examples can rely on a
  vetted mapping and reverse conversions.
- Add a QA harness that replays the open-source `div-transliteration` evaluation
  pairs via `evaluateTransliterationBenchmark` to surface accuracy and
  Levenshtein scores inside tooling dashboards.
- Ship a reusable keyboard binding manifest
  (`tools/dhivehi/thaana-input-toolkit.ts`) so client apps can render virtual
  Thaana layouts, intercept key events, and replay sequences for QA scenarios.

#### Checklist

- [ ] Component wrapper and storybook examples for `ThaanaKeyboard` are merged
      into the shared UI workspace.
- [ ] Transliteration test suite covers numerals, punctuation, ligatures, and
      mixed-script inputs.
- [ ] Helpdesk and CRM deployments confirm graceful fallback to the on-screen
      keyboard when native Thaana layouts are unavailable.

### 2. Translation Memory & Glossaries

- Import base strings from `Javaabu/laravel-dhivehi-translate` into a unified
  localization repository (e.g., JSON/CSV stored in Supabase).
- Normalize translation keys and annotate domain-specific terminology (finance,
  compliance, product names).
- Build a glossary sync job that cross-references Radheef entries for synonyms
  and morphological variations, then surfaces preferred phrases inside the
  support composer.
- Wire the in-repo translation memory utilities
  (`tools/dhivehi/translation-memory.ts`) and glossary dataset
  (`tools/dhivehi/glossary.ts`) into QA dashboards so Dhivehi reviewers can
  validate terminology drift sprint-over-sprint.

#### Checklist

- [ ] Supabase localization schema provisioned with import scripts for Laravel
      and WordPress strings.
- [ ] Glossary entries tagged with finance and compliance terminology plus
      Radheef-derived synonyms.
- [ ] Support composer integration surfaces preferred phrases with inline QA
      notes.

### 3. QA Benchmarks

- Create Dhivehi ⇄ English sentence pairs drawn from support tickets, marketing
  copy, and Quran translation segments.
- Tag each pair with metadata: domain, tone, required transliteration, quality
  score.
- Publish the benchmark inside our evaluation harness (e.g., BLEU/COMET scoring
  notebooks) and expose a lightweight dashboard to support leads.

#### Checklist

- [ ] Parallel corpus assembled with licensing metadata and reviewer
      attribution.
- [ ] Automated BLEU/COMET scoring notebooks parameterized for Dhivehi domain
      tags.
- [ ] Support operations dashboard exposes benchmark trendlines and reviewer
      comments.

## Phase 2 – Service Enablement (Weeks 5–8)

Wire the linguistic assets into production support flows and ensure agents can
resolve Dhivehi tickets end-to-end.

### 4. Translation Microservice

- Containerize a translation API using Laravel or Node that consumes the
  glossary and translation memory, exposing latency budgets that fit live chat
  SLAs.
- Integrate `HassanIyan/Alpaca-dhivehi` adapters for neural translation
  suggestions while enforcing human review on high-risk domains.
- Expose REST + gRPC endpoints for CMS ingestion pipelines and bot frameworks,
  plus a streaming hook so the support co-pilot can show draft replies in real
  time.

#### Checklist

- [ ] Translation API deployed with latency SLAs logged and alerting enabled.
- [ ] Alpaca-dhivehi adapters versioned with evaluation snapshots and human
      review gating.
- [ ] Streaming draft reply channel integrated with support co-pilot UI.

### 5. CMS & Knowledge Base Integration

- Deploy `Javaabu/wpml-dhivehi-extension` on WordPress properties; ensure
  glossary sync via REST hooks.
- Inject the Thaana Input Toolkit into CMS editors, so Dhivehi authors can
  toggle transliteration during content creation and reuse the same dictionary
  that powers the support composer.

#### Checklist

- [ ] WordPress CMS instances upgraded with Dhivehi extension and glossary sync
      webhooks verified.
- [ ] Editorial QA confirms Thaana Input Toolkit toggles work in Gutenberg and
      legacy editors.
- [ ] Knowledge base articles display glossary-driven preferred phrases and
      transliteration hints.

### 6. Numeric & Financial Utilities

- Port the conversion logic from `DhivehiMVR_excel` into a shared utility
  package (TypeScript + PHP bindings).
- Write regression tests covering currency, percentages, and ledger narration
  formats.
- Pipe outputs into accounting exports, invoices, and chatbot financial
  explanations, ensuring agents can paste localized numbers directly into
  customer responses.

#### Checklist

- [ ] Shared utility package published with TypeScript and PHP bindings plus
      CI-backed regression tests.
- [ ] Finance workflows (invoices, repayment schedules) render Dhivehi numerals
      without manual intervention.
- [ ] Chatbot financial explanations include copy-paste safe localized values
      for agents.

## Phase 3 – Multimodal Intelligence (Weeks 9–12)

Expand beyond text so voice, long-form content, and retrieval tools feed the
same co-pilot dashboard.

### 7. Speech-to-Text Pipeline

- Productionize `beneyraheem/thaanaSTT` by containerizing pyAudioAnalysis
  preprocessing and Whisper/Conformer decoding.
- Schedule batch transcription for archival audio (podcasts, calls) and feed
  transcripts into Supabase + vector index for search, tagging each with ticket
  IDs for cross-channel continuity.
- Build a feedback UI that lets reviewers fix misheard words, updating
  acoustic/language models periodically and notifying agents when corrected
  transcripts unlock new insights.

#### Checklist

- [ ] Containerized STT pipeline deployed with audio ingestion quotas and WER
      monitoring.
- [ ] Historical hotline recordings processed and linked to support tickets in
      Supabase/vector index.
- [ ] Reviewer feedback UI shipping corrections back into fine-tuning jobs and
      notifying agents of updates.

### 8. LLM Fine-Tuning & Agents

- Aggregate cleaned Dhivehi corpora (Radheef definitions, Quran translation,
  support transcripts) into training datasets.
- Use `HassanIyan/Alpaca-dhivehi` recipes to fine-tune instruction models; track
  metrics against the QA benchmark.
- Deploy bilingual assistant agents that can summarize English briefs into
  Dhivehi and vice versa with confidence scoring, embedding responses directly
  in the ticket sidebar.

#### Checklist

- [ ] Dhivehi training corpora curated with consent, licensing, and PII
      scrubbing verified.
- [ ] Fine-tuned models evaluated against QA benchmarks with regression alerts
      configured.
- [ ] Ticket sidebar assistants expose confidence scores and fallback to human
      review when thresholds fail.

### 9. Retrieval-Augmented Translation QA

- Index the Quran translation repository (`kudanai/Quran-Translation`) plus
  other authoritative texts in a vector store.
- During translation review, surface nearest-neighbor references to validate
  semantic accuracy and tone consistency, highlighting the rationale inside the
  co-pilot UI.

#### Checklist

- [ ] Quran and authoritative corpora ingested with citation metadata and
      version control snapshots.
- [ ] Reviewer workflow highlights nearest-neighbor references with acceptance
      logging.
- [ ] Co-pilot UI surfaces citation-backed rationale for Dhivehi translation
      approvals and escalations.

## Governance & Quality Controls

- **Data Provenance** – Document licenses and attribution for each repository;
  ensure religious texts maintain fidelity standards.
- **Human-in-the-Loop** – Gate all high-impact translations with bilingual
  reviewers until automated metrics consistently exceed thresholds.
- **Accessibility** – Verify Thaana keyboard and content render properly on
  mobile, screen readers, and RTL-aware layouts.
- **Security** – Harden API endpoints with rate limiting and audit trails,
  especially for speech uploads and translation requests.
- **Monitoring** – Log transliteration error rates, translation BLEU/COMET
  scores, and ASR word error rates; trend over time for regressions.

## Deliverables Checklist

- [ ] Reusable Thaana input package published within the monorepo.
- [ ] Translation memory + glossary synchronized with Supabase and CMS
      instances.
- [ ] Dhivehi ⇄ English evaluation dataset with automated scoring notebooks.
- [ ] Translation microservice deploying Alpaca-dhivehi adapters.
- [ ] Speech-to-text pipeline shipping reviewed transcripts to knowledge stores.
- [ ] Retrieval QA workflow referencing Quran translation ground truth.

## Repository Utilities Implemented

- **Transliteration** – `tools/dhivehi/transliteration.ts` exposes Latin ⇄
  Thaana conversion plus scoring helpers aligned with `aharen/thaana-keyboard`.
- **Translation Memory** – `tools/dhivehi/translation-memory.ts` provides
  in-memory fuzzy matching so Dhivehi segments can be reused during support
  escalations.
- **Glossary & Terminology** – `tools/dhivehi/glossary.ts` ships a seed dataset
  derived from Radheef, DhivehiMVR, and Quran references with search APIs that
  feed support QA dashboards.

## Success Metrics for the Support Co-Pilot

- **Agent Adoption** – ≥80% of Dhivehi tickets drafted or reviewed with the
  co-pilot active within three months of launch.
- **Translation Quality** – BLEU ≥35 and COMET ≥0.70 on the Dhivehi ⇄ English
  benchmark, plus <5% human override rate on high-priority tickets.
- **Response Time** – Median handle time for Dhivehi tickets within 10% of the
  English baseline after Phase 2 rollout.
- **Speech Coverage** – ≥70% of hotline calls transcribed and linked to tickets
  with <20% word error rate by the end of Phase 3.

## Next Actions

1. Assign engineering owners for Input Toolkit, Translation Service, and Speech
   Pipeline workstreams.
2. Spin up a Supabase project (or reuse existing) dedicated to Dhivehi corpora
   and evaluation artifacts.
3. Schedule bilingual reviewer onboarding and define SLA for translation
   approvals.
4. Update this playbook quarterly as new Dhivehi language tools emerge or
   internal benchmarks evolve.
