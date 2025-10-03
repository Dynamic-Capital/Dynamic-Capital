# Grading and Scoring Overview

This note summarises widely used grading conventions and highlights how
referencing, indexing, and research practices contribute to assessment outcomes.
Use it as a quick reference when you need to translate scores across systems,
explain rubric weights to stakeholders, or tune a dynamic grading loop.

## 1. Academic Grading Systems

Different regions express achievement using distinct grading models, but the
underlying goal is consistent: communicate performance in a standardized way.

### Letter Grades

- Common in the United States and used in select European and Asian
  institutions.
- Typically map to qualitative descriptors (e.g., A = excellent, B = good) and
  to GPA points.

| Percentage band | Letter  | GPA (4-point) | Descriptor            |
| --------------- | ------- | ------------- | --------------------- |
| 93–100          | A       | 4.0           | Excellent mastery     |
| 90–92           | A-      | 3.7           | Very strong mastery   |
| 87–89           | B+      | 3.3           | Above-average mastery |
| 83–86           | B       | 3.0           | Solid mastery         |
| 80–82           | B-      | 2.7           | Mostly proficient     |
| 70–79           | C range | 2.0–2.3       | Developing mastery    |
| 60–69           | D range | 1.0–1.3       | Limited mastery       |
| <60             | F       | 0.0           | Fails expectations    |

### Percentage Scales

- Represent performance on a 0–100 scale, often with pass marks between 40 and
  60 depending on the jurisdiction.
- Facilitate straightforward averaging across multiple assessments and simple
  weighting when combining coursework and exams.

### Grade Point Average (GPA)

- Converts letter grades or percentages into a 0.0–4.0 or 0.0–5.0 scale.
- Enables cumulative tracking across courses and academic terms.
- Calculated as the sum of (grade points × credit hours) divided by total credit
  hours.

**Worked example**

> A student completes three courses worth 3, 4, and 2 credits with grade points
> of 4.0, 3.3, and 3.7 respectively. GPA =
> `(4.0 × 3 + 3.3 × 4 + 3.7 × 2) ÷ (3 + 4 + 2) = 3.57`.

### Class or Division Systems

- Used by universities in the UK, India, and other Commonwealth systems.
- Typical tiers: First Class/Distinction, Second Class (Upper/Lower), Third
  Class/Pass.
- Often paired with percentage thresholds, shown below for a common model:

| Division                  | Percentage benchmark | Typical descriptor       |
| ------------------------- | -------------------- | ------------------------ |
| First Class / Distinction | ≥70%                 | Outstanding performance  |
| Second Class – Upper      | 60–69%               | Strong performance       |
| Second Class – Lower      | 50–59%               | Satisfactory performance |
| Third Class / Pass        | 40–49%               | Meets minimum standard   |
| Fail                      | <40%                 | Below standard           |

### Descriptive Competency Levels

- Employed in competency-based education to indicate mastery (e.g., Excellent,
  Good, Satisfactory, Fail).
- Requires clearly defined performance descriptors that align with observable
  behaviors or rubric statements.

### Converting Between Systems

- **Letter ↔ percentage**: Institutions publish conversion guides; when one is
  missing, anchor to accreditation standards or discipline-specific norms.
- **Percentage ↔ GPA**: Multiply the percentage by the institution’s scaling
  factor (e.g., 25 for a 0–100 to 0–4 scale) after aligning thresholds.
- **Division ↔ GPA**: Map percentage thresholds to the GPA table above to
  approximate class standing when evaluating international transcripts.

## 2. Scoring Assignments and Research Work

Rubrics for written assignments often assign weight to research rigor,
structure, and citation practices.

| Criterion                   | Typical Weight | Focus of evaluation                                   |
| --------------------------- | -------------- | ----------------------------------------------------- |
| Content & Analysis          | 40–50%         | Depth of research and argument quality.               |
| Organization & Structure    | 20–30%         | Logical flow, headings, and indexing clarity.         |
| Referencing & Citation      | 10–20%         | Accuracy of citations and completeness of references. |
| Language & Presentation     | 10–15%         | Grammar, tone, formatting, and readability.           |
| Index Quality (if required) | 5–10%          | Precision of entries and cross-references.            |

Rubrics may also award discrete marks for:

- Correct implementation of citation formats.
- Comprehensive bibliographies or reference lists.
- Inclusion and accuracy of document indexes when required.
- Integration of persistent identifiers (e.g., DOIs) for cited works.
- Evidence of source evaluation and annotation quality when annotated
  bibliographies are assigned.

### Referencing and Indexing Checklist

- Confirm that every in-text citation is matched with a reference list entry.
- Verify adherence to the required citation style guide for punctuation,
  capitalization, and italicisation.
- Ensure indexes include key concepts, names, and figures with accurate page
  references.
- Use citation management tools (e.g., Zotero, EndNote) to reduce format errors.
- Include plagiarism screening reports when institutional policy mandates
  originality verification.

**Common referencing pitfalls to watch for**

- Missing publication dates or DOIs for digital sources.
- Inconsistent author naming conventions between in-text citations and the
  bibliography.
- Incorrect page spans for direct quotes or paraphrases.
- Outdated URLs that no longer resolve; prefer archived links or persistent
  identifiers.
- Index entries that list major concepts but omit subtopics, reducing
  navigability.

**Index quality quick rubric**

| Score          | Characteristics                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| Exemplary      | Entries cover all major themes, include subentries, and maintain alphabetic order with accurate page spans. |
| Proficient     | Most key concepts are indexed, but a few cross-references or subentries are missing.                        |
| Developing     | Index includes generic terms only; pagination errors or inconsistent formatting present.                    |
| Needs Revision | Index omitted or unusable due to alphabetisation issues or missing page references.                         |

## 3. Research and Publication Metrics

Beyond classroom assessments, publication impact is measured with quantitative
indicators.

- **Citation-based metrics**: h-index and i10-index track how frequently an
  author's work is cited.
- **Journal Impact Factor**: Indicates how often articles in a journal are
  cited, signaling its influence.
- **Plagiarism/Originality Scores**: Tools like Turnitin gauge the uniqueness of
  submissions, often requiring a low similarity index for acceptance.

## 4. Optimizing Dynamic Grading Models

Dynamic grading systems adapt rubric weights or expectations in real time based
on learner performance trends or course-level objectives. A repeatable
optimization cycle helps ensure transparency and fairness.

### 4.1 Inputs for Dynamic Adjustment

- **Baseline rubric**: The static weights that align with course outcomes (e.g.,
  the table above).
- **Performance signals**: Aggregated scores, time-on-task data, or mastery
  checks that reveal areas where students struggle or excel.
- **Constraints**: Minimum/maximum weights so that critical competencies (like
  referencing integrity) always receive attention.

#### Comprehensive Knowledge Base Grading

Dynamic Capital's benchmark toolkit now exposes a `grade_comprehensively` helper
that rolls up multiple knowledge base slices into a single academic-style grade.
The CLI (`python scripts/run_knowledge_base_benchmark.py`) prints both the
per-domain classifications and the weighted aggregate metrics so governance
teams can evaluate systemic coverage, accuracy, and telemetry freshness at a
glance. Provide optional weights when certain domains should influence the
comprehensive score more than others.

### 4.2 Optimization Loop

1. **Collect** current assessment data after each grading period.
2. **Normalize** scores across sections or instructors to remove systematic bias
   before analysis.
3. **Diagnose** gaps by comparing cohort performance against baseline
   expectations.
4. **Reweight** rubric components within predefined constraints to emphasize
   underperforming competencies.
5. **Communicate** changes to learners before the next assessment window to
   preserve fairness and compliance.
6. **Evaluate** whether the adjustment improved mastery; revert or iterate as
   needed.

### 4.3 Sample Weight Adjustment Formula

```text
new_weight_i = clamp(
  baseline_weight_i + learning_rate * (target_mastery_i - actual_mastery_i),
  min_weight_i,
  max_weight_i
)
```

- **learning_rate** controls how aggressively weights shift between grading
  cycles.
- **target_mastery** can be derived from accreditation standards or program
  goals.
- Applying a `clamp` function keeps weights inside acceptable bounds so no
  criterion (e.g., referencing accuracy) is ignored.
- Use a smoothing factor (e.g., exponential moving average) on
  `actual_mastery_i` to avoid reacting to outlier assignments.
- When cohorts have different sample sizes, weight mastery calculations by the
  number of submissions in each cohort.

### 4.4 Implementation Checklist

- Instrument rubrics in a spreadsheet or LMS that supports conditional
  weighting.
- Log each weight change with justification for auditability.
- Run scenario tests to confirm overall scores remain comparable across cohorts.
- Provide exemplars and updated indexing/referencing guidelines whenever
  emphasis changes.
- Monitor fairness metrics (e.g., demographic parity, equal opportunity) after
  each adjustment cycle.
- Document approval workflows so academic committees can review dynamic changes.

### 4.5 Operational Runbook Snapshot

| Phase       | Tasks                                                              | Outputs                                  |
| ----------- | ------------------------------------------------------------------ | ---------------------------------------- |
| Instrument  | Capture baseline rubric, constraints, and fairness guardrails.     | Versioned rubric, constraint matrix.     |
| Observe     | Collect and normalise performance signals across cohorts.          | Cleaned dataset with mastery indicators. |
| Optimise    | Apply weight adjustment formula, run counterfactual checks.        | Proposed weight deltas, fairness report. |
| Communicate | Share rationale with learners, instructors, and governance boards. | Updated rubrics, announcement notes.     |
| Review      | Evaluate outcomes, revert or iterate with approvals.               | Post-adjustment metrics, action items.   |

### 4.6 Worked Example

Consider a writing-intensive course with the baseline rubric weights shown
above. After three assignments, the cohort average for Referencing & Citation is
68% against a target of 80%, while Content & Analysis averages 85% with a target
of 82%.

1. Calculate mastery deltas: Referencing = −12 percentage points, Content = +3
   percentage points.
2. Apply the adjustment formula with a learning rate of 0.2:

   - Referencing new weight = 15% + 0.2 × (0.80 − 0.68) = 17.4%, clamped to a
     10–25% band.
   - Content new weight = 45% + 0.2 × (0.82 − 0.85) = 44.4%, clamped to a 35–50%
     band.
3. Verify total weight remains 100% by proportionally scaling unaffected
   criteria.
4. Communicate the rationale, updated referencing exemplars, and any new
   indexing expectations to students.
5. Re-evaluate after the next assignment; if mastery surpasses 80%, gradually
   revert weights toward the baseline.

### 4.7 Academic-Style Benchmarking for DAI, DAGI, and DAGS Knowledge Bases

Apply the academic grading mindset to the Dynamic AI (DAI), Dynamic AGI (DAGI),
and Dynamic AGS (DAGS) domains by translating their knowledge base health into
letter-grade bands. Each domain has a defined remit—DAI focuses on reasoning
cores, DAGI scales domain-spanning intelligence, and DAGS enforces governance
and reliability—which determines the evidence you should collect before scoring
them.【F:docs/dynamic-training-model-architecture.md†L5-L125】 The connectivity
runbooks already require mirrored datasets, Supabase coverage, and telemetry
logs, providing concrete metrics to sample for this style of
benchmark.【F:docs/dai-dagi-dags-connectivity.md†L3-L165】

1. **Coverage ratio** – Track the percentage of required Supabase tables and
   mirrored OneDrive artefacts present for the domain. Treat missing tables or
   empty manifest prefixes as immediate deductions because they break the data
   contract outlined in the connectivity reference.
2. **Accuracy and relevance sampling** – Review a statistically meaningful slice
   of stored artefacts (e.g., prompts, infrastructure jobs, audit trails) and
   confirm they align with the domain’s responsibilities. Penalise outdated or
   misclassified entries that would mislead downstream reasoning.
3. **Governance freshness** – Check that telemetry feeds, audit logs, and
   compliance artefacts are no older than the permitted service-level interval
   and that recent health probes succeeded. Stale mirrors or failed smoke tests
   warrant grade reductions until remediated.

| Grade band | Coverage threshold                            | Accuracy sample expectation                            | Governance & freshness test                                | Typical remediation                                                                                          |
| ---------- | --------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| A / A-     | ≥95% of catalogue objects present and current | ≥95% artefact accuracy with only minor edits required  | All latest health checks passing; telemetry <24h old       | Continue spot-audits and archive exemplars for future training cycles.                                       |
| B range    | 88–94% coverage with isolated gaps            | 85–94% artefact accuracy; minor reindexing needed      | One retry required to clear a health probe or refresh logs | Patch missing assets, document fixes, and schedule follow-up validation.                                     |
| C range    | 75–87% coverage; multiple datasets missing    | 70–84% accuracy with notable stale or misfiled entries | Repeated health probe failures or stale telemetry (>48h)   | Launch incident review, rebuild missing mirrors, and assign owners for corrective work.                      |
| D or lower | <75% coverage or critical catalogue absent    | <70% accuracy; artefacts contradict domain purpose     | Governance evidence missing or unverified                  | Escalate to domain leads, freeze dependent automations, and rebuild the knowledge base slice before release. |

Document the calculation in the same way you would justify a rubric score: cite
the probes you ran, the sample size inspected, and the remediation steps. This
makes the grade meaningful to executives while keeping the knowledge base audit
trail aligned with accreditation-style expectations.

Use the repository helper to snapshot results:

```bash
python scripts/run_knowledge_base_benchmark.py --config benchmarks/dai-dagi-dags.json
```

The script loads the JSON benchmark manifest, applies the grade bands above, and
prints remediation guidance for each domain so you can track improvements over
time.

### Latest Benchmark Snapshot

Re-running the benchmark after the most recent fine-tuning cycle yields the
following outlook:

- **DAI:** `A (A / A-)` — catalogue is effectively complete with fresh telemetry
  and near-perfect sample accuracy.
- **DAGI:** `B (B range)` — a handful of catalogue deltas remain, but telemetry
  and accuracy checks are back within the expected band.
- **DAGS:** `B (B range)` — sustained improvements in coverage and governance
  signals following remediation work.

The comprehensive rollup now grades **B (B range)** with weighted metrics of
96.3% coverage, 94.9% accuracy, 17.3 hours of telemetry freshness, and zero
failed checks, signalling that the knowledge base is operating within the target
quality guardrails.

## 5. Comprehensive Grading Checklist

Use this checklist to confirm that grading plans, supporting documentation, and
optimisation loops are fully prepared before an assessment cycle begins.

- [ ] Publish the grading framework, including conversion charts and competency
      descriptors, in the course handbook or LMS.
- [ ] Share the rubric with weightings, example responses, and indexing
      expectations before the first assignment is released.
- [ ] Provide or link to citation style guides, reference managers, and
      plagiarism policies that students must follow.
- [ ] Configure data collection for performance signals (scores, mastery checks,
      time-on-task) and validate privacy compliance.
- [ ] Define acceptable weight bounds and fairness metrics so dynamic
      adjustments remain transparent and auditable.
- [ ] Schedule checkpoints to review analytics, update rubric weights if needed,
      and document any changes with rationale.
- [ ] Communicate updates to students, instructors, and committees, highlighting
      how referencing and indexing emphasis may shift.
- [ ] Archive final scores, feedback, and adjustment logs to support
      accreditation reviews and continuous improvement.

## In Simple Terms

- Referencing and indexing organise knowledge so others can locate and verify
  the ideas you cite.
- Grading turns that performance into letters, percentages, GPAs, or divisions
  that stakeholders understand.
- Scores summarise how well each requirement was met, and many rubrics reserve
  explicit marks for referencing accuracy and index quality when they matter.

## Key Takeaways

- Referencing and indexing help organize knowledge and are integral to most
  grading rubrics.
- Grades translate qualitative performance into standardized scores or
  descriptors.
- Publication metrics extend the concept of scoring into the research domain by
  quantifying scholarly influence.
- Dynamic optimisation keeps grading aligned with learning objectives while
  remaining transparent to stakeholders.
