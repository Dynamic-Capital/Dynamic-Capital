# Next.js Dynamic Multi-LLM Build Orchestrator

This runbook describes how to compile a Next.js application that assembles content
from multiple large language models (LLMs) at build time. It ensures deterministic
output, guards against provider drift, and keeps the build pipeline idempotent so
multiple deployments across environments can reuse the same artifacts.

## Objectives

1. **Deterministic builds:** Every production build must produce identical HTML
   snapshots and JSON payloads, even when external LLMs are involved.
2. **Dynamic provider routing:** The system selects the best LLM profile per
   content task (copy blocks, metadata, structured JSON) while respecting
   provider quotas, latency, and safety scoring.
3. **Auditability:** Persist prompts, responses, and selection rationale to a
   versioned store so QA can reproduce a build locally.
4. **Fail-safe degradations:** When LLM providers are unavailable or responses
   violate guardrails, the build substitutes cached material or curated fallbacks.

## Architecture Overview

```text
nextjs-multi-llm/
├── config/
│   ├── llm-profiles.json       # Provider weights, quotas, output format hints
│   └── content-map.yaml        # Page/component -> prompt templates & guardrails
├── scripts/
│   ├── generate-content.ts     # Invoked during `next build` to hydrate content
│   └── hydrate-cache.ts        # Refreshes persisted responses for CI/CD
├── store/
│   └── prompts.db              # SQLite (libSQL) file storing prompts/responses
└── README.md                   # This document
```

Key services:

- **Profile Registry:** Declarative JSON describing each LLM vendor, including
  input/output token budgets, guardrail validators, retry policies, and
  associated environment variables.
- **Content Map:** YAML file mapping Next.js routes, server components, and
  dynamic segments to prompt templates with variable interpolation.
- **Prompt Cache:** Deterministic store (SQLite/libSQL) keyed by
  `build_id + content_id` to guarantee reproducible outputs.
- **Telemetry Bus:** Structured logs streaming to Vercel/Datadog for monitoring
  provider performance and guardrail violations.

## Build-Time Algorithm

The build pipeline wraps `next build` with a preflight script. The high-level
control flow is:

```pseudo
function orchestrateBuild(env) {
  buildId = timestampedId()
  registry = loadProfiles(env)
  contentMap = loadContentMap()
  cache = openPromptStore(buildId)

  for each contentTask in contentMap.tasks:
    metadata = enrichTask(contentTask)
    provider = selectProvider(registry, metadata)

    if cache.has(buildId, contentTask.id):
      use cached response to hydrate artifacts
      continue

    prompt = renderPrompt(contentTask.template, metadata)
    response = executeWithGuardrails(provider, prompt, metadata)

    if response.ok:
      cache.save(buildId, contentTask.id, prompt, response)
      emitStaticAsset(contentTask, response)
    else if response.retryable:
      provider = fallbackProvider(registry, provider, metadata)
      repeat execution up to N attempts
    else:
      applyFallback(contentTask)
      logIncident(buildId, contentTask.id, response.error)

  finalizeStaticExports()
  writeBuildManifest(buildId, cache.summary())
}
```

### Provider Selection Heuristics

1. **Task Type:** `longform`, `metadata`, `json`, `code-snippet`, etc. Each task
   maps to a weighted provider list.
2. **Budget Check:** Skip providers whose projected token consumption would
   exceed the daily budget or concurrency guardrails.
3. **Latency SLO:** Favor providers meeting the target response time for the
   current build stage. Long-form copy may allow slower models than metadata.
4. **Safety Score:** Use the latest moderation feedback (stored in the prompt
   cache) to demote providers that recently produced flagged content.

### Guardrails Pipeline

1. Validate JSON schema or Markdown rules using `ajv` / `markdownlint`.
2. Run semantic filters (PII, regulatory phrases) via a lightweight classifier.
3. If a guardrail fails:
   - Retry with `provider.nextFallback` (if defined) using the same prompt.
   - Record the failure in the cache with status `violated` for auditing.
   - If all fallbacks fail, emit curated copy (`contentTask.fallbackPath`).

### Hydrating Next.js Assets

- **`generateStaticParams` / `generateMetadata`:** Import the prompt cache module
  to read deterministic values for dynamic routes and meta tags.
- **Server Components:** Wrap LLM-powered content in a `loadLLMFragment(id)`
  helper that pulls the cached response during rendering.
- **Edge Functions / Route Handlers:** Avoid runtime inference by embedding the
  cached response into JSON manifests consumed at request time.

## CI/CD Workflow

1. `npm run build`: triggers `scripts/generate-content.ts` before `next build`.
2. The script computes the `buildId`, refreshes the prompt cache, and writes
   artifacts under `.next/cache/llm/<buildId>/`.
3. `next build` reads the cached responses to render pages.
4. Post-build, `scripts/hydrate-cache.ts` uploads the prompt database to object
   storage (e.g. Supabase bucket) tagged with the git commit SHA.
5. Production deploys download the stored cache to guarantee matching artifacts.

## Operational Runbook

- **Rotating Providers:** Update `config/llm-profiles.json` with the new model,
  run `scripts/hydrate-cache.ts --refresh-provider <name>` to regenerate affected
  tasks, and commit the resulting cache diff.
- **Audit Requests:** Use the prompt store to export conversation traces for
  compliance teams. Include `provider`, `prompt_hash`, `response_hash`, and
  moderation status.
- **Incident Response:** If a provider drifts, toggle its `active` flag in the
  profile registry and redeploy. The fallback path ensures builds continue using
  cached copy.

## Extension Ideas

- **Speculative Decoding:** Query two providers concurrently and choose the
  response that passes guardrails first.
- **Human Review Queue:** Mark sensitive tasks as `requiresApproval` and push the
  generated draft to an approval dashboard before finalizing the build.
- **Regression Tests:** Snapshot rendered HTML/JSON fixtures and diff them against
  the cached responses on every PR to detect prompt or configuration drift.
