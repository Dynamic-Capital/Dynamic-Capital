# Summary Systems Playbook

Summaries keep Dynamic Capital's deliverables legible across research, product,
and go-to-market streams. Use this guide to pick the right style, match the
required depth, and align grading criteria with the way we archive knowledge in
this repo.

## Why Summaries Matter Here

- **Cross-team signal:** Summaries kick off every async update so product,
  capital, and research squads can scan outcomes quickly.
- **Documentation gateway:** Each summary should link to its source doc (spec,
  runbook, data room memo) and note where it lives in the knowledge map.
- **Scoring lever:** QA reviewers use the summary rubric to allocate up to 15%
  of a deliverable's score.

## Depth Profiles

| Depth tier      | When to use it                                  | Dynamic Capital example                           | Required ingredients                               |
| --------------- | ----------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| **Descriptive** | Quick context pass or sync recap                | Daily trading desk stand-up log                   | 2–3 sentence storyline, owner, time frame          |
| **Informative** | Research abstracts and product experiments      | Supabase analytics audit, smart order router test | Problem, method, data snapshot, decision           |
| **Evaluative**  | Investment memos, retros, or vendor assessments | Validator infrastructure review                   | Judgment call (pass/block), rationale, next action |

> ⚙️ **Tip:** Start with descriptive notes, then expand to informative or
> evaluative once data arrives. This keeps revisions small and auditable.

## Length & Format Standards

- **Abstract (≤ 250 words):** Default for research drops, RFCs, and sprint
  demos. Keep it in paragraph form so it can be pasted into investor updates.
- **Executive summary (1–2 pages):** Use for board packets or cross-functional
  launch plans. Include a table of action items with owners.
- **Synopsis (≤ 8 sentences):** Ideal for playbook refreshes or book/article
  distillations shared in `dynamic_library/`.
- **Condensed outline:** Bullet format stored alongside meeting notes or
  transcripts. Pair each bullet with a notion of impact (e.g., revenue,
  latency).

## Purpose-Driven Patterns

| Purpose                       | Channel                                        | Summary cues                                                                 |
| ----------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| **Academic / Research**       | `dynamic_research/`, `dynamic_cap_theorem/`    | Cite datasets, list assumptions, flag replication steps.                     |
| **Professional / Recruiting** | `dynamic_development_team/`, LinkedIn snippets | Highlight velocity metrics, stack expertise, and quantified wins.            |
| **Study / Revision**          | `dynamic_learning/`, study halls               | Capture formulae, mnemonics, and checkpoint questions.                       |
| **Technical / Ops**           | `dynamic_infrastructure/`, runbooks            | Mention environment, configs, rollback plan, and related Grafana dashboards. |

## Workflow Integration

1. **Draft the summary alongside the source doc.** Place it near the top so
   search previews show context.
2. **Tag references:** Use inline links or reference IDs that match entries in
   `dynamic_index/` to keep navigation synchronized.
3. **Update the index:** Add or update the relevant entry using the conventions
   in `docs/REPO_FILE_ORGANIZER.md`.
4. **Log citations:** Follow the referencing guide in `docs/REFERENCING.md` (or
   create a stub if the source is new).
5. **Submit for scoring:** Reviewers annotate the summary using the rubric below
   before final approval.

## Grading & QA Rubric (15% of total score)

| Criterion           | Weight | What reviewers check                                                          |
| ------------------- | ------ | ----------------------------------------------------------------------------- |
| Accuracy vs. source | 5%     | Facts, metrics, and decisions line up with the underlying document.           |
| Clarity & brevity   | 4%     | Sentences are active, jargon is defined, and length stays within target band. |
| Traceability        | 3%     | Links to source material, index entries, and ticket IDs are present.          |
| Actionability       | 3%     | Readers know who owns the next step, deadline, or risk mitigation.            |

## Quick Checklist Before Publishing

- [ ] Summary type matches the deliverable and audience.
- [ ] Word count or page length is within spec.
- [ ] References and index pointers are live.
- [ ] Next actions, owners, and deadlines are explicit.
- [ ] QA reviewer signed off with rubric score.

## Automation Support

- **`dynamic_summary.SummaryPlanner`:** Imports the depth, length, and purpose
  profiles defined here so scripts can generate blueprints or lint drafts
  against the rubric without re-implementing the tables.
- **Rubric integration:** Provide 0–1 ratings for accuracy, clarity,
  traceability, and actionability to compute the weighted QA score
  programmatically.
- **Format validation:** Feed draft metrics (word count, sentence count,
  references, bullets) to surface the same publishing checklist issues reviewers
  look for.
- **Checklist automation:** Call `SummaryPlanner.checklist_report(...)` to
  confirm all publishing checklist items (type alignment, length, references,
  actions, QA sign-off) are satisfied and retrieve remediation notes when they
  are not.

Revisit this playbook whenever we onboard new collaborators or ship a new
documentation workflow so summary standards stay aligned with the rest of the
Dynamic Capital project.
