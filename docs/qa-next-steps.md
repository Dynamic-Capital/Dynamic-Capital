# QA Review Next Steps

## 1. Repository Orientation

- Revisit the root `README.md` and architecture diagrams to refresh context.
- Map the directories most relevant to investor experience: `apps/web`, `core`,
  `automation`, and `_static`.

## 2. Priority Inspection Tracks

1. **Bull Analyst Track**
   - Validate UX pathways in the Next.js Mini App for onboarding and portfolio
     views.
   - Ensure growth-enabling services (hedging adapters, Multi-LLM Studio) meet
     performance expectations.
2. **Bear Analyst Track**
   - Probe Supabase policies, edge functions, and Telegram handshake helpers for
     failure handling.
   - Assess logging/alerting coverage in automation pipelines for resilience
     gaps.
3. **Pattern Synthesis Engine**
   - Trace shared libraries between automation and web surfaces for coupling
     issues.
   - Document systemic risks discovered across crawlers, hedging models, and
     dashboards.

## 3. Verification & Testing

- Execute `npm run lint`, `npm run typecheck`, and targeted `npm run test`
  suites after any code change.
- Run `npm run format` prior to committing to guarantee consistent formatting.

## 4. Reporting & Alignment

- Capture findings in `docs/` with clear traceability to code locations.
- Maintain alignment with security and governance policies outlined in
  `SECURITY.md` and related playbooks.

## 5. Follow-Up Actions

- Schedule a debate between Bull and Bear analysts for each major finding.
- Prioritize remediation tasks with estimated effort and potential impact
  ratings.
