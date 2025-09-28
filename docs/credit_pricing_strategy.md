# Credit and Pricing Optimization Playbook

## Overview
This guide explains how to translate the Dynamic Credit Model into pricing and product decisions for your project, including VIP and mentorship offerings. It outlines how to plan feature work, bundle services, and allocate credits when using AI chat and tooling.

## 1. Map Project Scope to Credit Usage
- **Inventory feature areas**: list all planned pages, integrations, and automation tasks. Group them into milestones (e.g., MVP, VIP enhancements, mentorship portal).
- **Estimate credit consumption**: use the playbook baseline—10–20 credits for small projects, 40–70 for medium builds. Add buffers for iterations that require autonomous Agent Mode runs.
- **Batch related work**: combine backend updates, UI tweaks, and copy changes for a single milestone into one structured prompt to minimize credit burn.
- **Schedule high-impact prompts**: reserve larger credit allocations for scaffolding and complex workflows. Handle micro-fixes manually or batch them into maintenance sprints.

> **Credit Budget Worksheet**
>
> | Milestone | Feature bundle | Estimated credits | Buffer (15%) | Total allocation |
> | --- | --- | --- | --- | --- |
> | MVP | Auth, dashboard, base styling | 24 | 4 | 28 |
> | VIP Enhancements | Automation, analytics, QA scripts | 32 | 5 | 37 |
> | Mentorship Portal | Curriculum builder, reporting | 18 | 3 | 21 |
> | **Total** |  | **74** | **12** | **86** |

Use the worksheet as a living document to track scope changes and prevent starting milestones without adequate credit coverage.

## 2. Build a Credit-to-Cash Pricing Model
- **Set an internal credit cost**: divide your monthly platform fee (or opportunity cost) by the credits available. Example: $120/month ÷ 100 credits = **$1.20 internal cost per credit**.
- **Choose a margin target**: apply a markup that reflects your expertise and delivery risk. A 2.5× multiplier yields a **$3.00+ price per credit** in the example above.
- **Translate credits to packages**: multiply the priced credit rate by the credit allocation in the worksheet to generate baseline package prices.
- **Layer service premiums**: add surcharges for governance (reporting, documentation), rush delivery, or specialized compliance work.

### Pricing Calculator (Sample)

```
Package price = (Allocated credits × Price per credit) + Service premiums - Included discounts
```

Maintain a shared spreadsheet that auto-updates package pricing when credit allocations shift.

## 3. Create Tiered Offers Anchored to Credits
- **Define service tiers**: align each package (Core, VIP, Mentorship) to the credits required to deliver its features. Use higher credit tasks (e.g., custom automation, integrations) as justification for premium pricing.
- **Show value transparency**: communicate how many AI build cycles, QA checks, or automation scripts are included. This positions higher tiers as covering more intensive credit usage.
- **Bundle support intelligently**: include a set number of chat-based consulting sessions in each tier, pegged to the 1-credit-per-exchange baseline.
- **Add rollover perks**: for VIP clients, allow unused strategy or QA sessions to roll into the next phase, mirroring the rollover concept in the playbook.
- **Codify guardrails**: document what is **out of scope** for each tier (e.g., “VIP excludes net-new product categories without re-estimation”) to prevent stealth scope creep.

### Sample Tier Matrix

| Tier | Core Inclusions | Credit Allocation | Price Signal |
| --- | --- | --- | --- |
| Core | MVP feature set, 2 QA passes, 2 chat syncs/week | 30 credits | Entry point |
| VIP | Core + automation scripts, analytics, daily chat, 48h turnaround | 55 credits | Premium execution |
| Mentorship | Weekly coaching, code reviews, curriculum drops, optional build boosts | 24 credits (base) + add-on bundles | Growth-focused |

## 4. Design VIP Pricing Strategy
- **Premium deliverables**: allocate credits for advanced features—analytics dashboards, multi-environment deployments, or automations requiring Agent Mode.
- **Expedited turnaround**: dedicate credits to parallelized prompts (e.g., simultaneous backend and frontend updates) to support faster delivery, and price VIP tiers accordingly.
- **Exclusive support**: set aside credits for daily chat check-ins, architecture reviews, and emergency fixes. Factor the cumulative credit load into the VIP premium.
- **Scalability buffer**: maintain a reserve of credits (10–20% of monthly pool) for unforeseen VIP requests so you can respond without pausing other clients.
- **Outcome-based incentives**: pair part of the VIP fee to hitting high-value deliverables (e.g., launch date, KPI uplift) while keeping a core retainer to cover the guaranteed credit spend.

### VIP Sprint Rhythm
1. **Weekly scope sync (1 credit)** → confirm priority backlog.
2. **Parallel build prompt (2–3 credits)** → run coordinated Agent Mode sequences for backend + frontend.
3. **QA and validation (1 credit)** → request integration tests or regression sweeps.
4. **Executive summary (0.5–1 credit)** → generate client-ready status updates.
5. **Reserve** → keep 1–2 credits unallocated for urgent hotfixes.

## 5. Structure Mentorship Pricing
- **Curriculum planning**: estimate credits for lesson material generation, code reviews, and walkthroughs. Each targeted lesson or code audit typically fits in a single credit if batched.
- **Session cadences**: package mentorship offerings around weekly or biweekly sessions, each with pre-session prep (1 credit) and follow-up materials (1 credit).
- **Self-serve resources**: invest credits once to produce reusable guides and templates. Reuse them across mentees to keep per-mentee credit costs low and margins high.
- **Upsell to project support**: include optional add-ons where mentees can tap Agent Mode for complex builds, priced as incremental credit bundles.
- **Mentor capacity planning**: track credits consumed per mentee against availability. Cap total mentorship credits at 30–40% of your monthly pool to preserve build capacity.

### Mentorship Session Blueprint
- **T−2 days**: Collect agenda + repo link (no credit).
- **T−1 day**: Prep plan + code review (1 credit).
- **Session day**: Facilitate call using saved prompts; capture action items (1 credit if AI-assisted notes).
- **T+1 day**: Send follow-up assets, record ledger entry (1 credit).
- **End of month**: Summarize progress + recommend next steps (0.5 credit, reusable template).

## 6. Optimize Daily Credit Usage
- **Plan prompts ahead**: outline objectives, inputs, and expected outputs before engaging Chat Mode so each exchange is high value.
- **Use structured templates**: e.g., “Goal → Context → Desired Output → Constraints.” This reduces clarification loops.
- **Leverage free credits**: apply daily free interactions for ideation, roadmap validation, or refining prompts before executing Agent Mode runs.
- **Track in a ledger**: maintain a simple spreadsheet recording date, prompt, credits used, and deliverable. Review weekly to adjust pacing.
- **Institute daily caps**: set soft limits (e.g., ≤6 credits/day outside of launches) to ensure runway lasts the entire billing cycle.
- **Create a prompt library**: store high-performing prompts with expected outputs so team members reuse instead of reinventing them.

## 7. Operational Best Practices
- **Export deliverables regularly**: archive generated code, docs, and assets after each major prompt to avoid re-spending credits on retrieval.
- **Set milestone gates**: only trigger high-credit tasks (deployments, test suites) when prerequisites are complete to prevent waste.
- **Review burn-down**: compare remaining credits against upcoming milestones; if the ratio is low, adjust scope or upgrade plan preemptively.
- **Continuous improvement**: after each sprint, analyze which prompts delivered the highest ROI. Refine your prompt templates and batching strategy based on outcomes.
- **Feedback loop**: pair the monthly audit with team retrospectives to convert insights into updated pricing tiers, SOPs, and prompt guides.

## 8. Audit Workflow
Conduct a monthly or post-project audit to confirm your credit usage and pricing remain aligned. Use the following steps:

1. **Collect data**
   - Export the credit ledger covering the audit period.
   - Compile project timelines, feature scopes, and pricing agreements.
2. **Assess efficiency**
   - Compare planned versus actual credit burn per milestone.
   - Flag prompts that required rework or multiple retries.
3. **Validate pricing alignment**
   - Confirm each tier delivered the promised assets, sessions, and support levels.
   - Recalculate margins using the real credit consumption numbers.
4. **Document insights**
   - Capture lessons learned for prompt templates, batching approaches, and scope sequencing.
   - Outline adjustments for the next planning cycle.

## 9. Quick Reference Checklists

### Credit Planning & Execution
- [ ] Batch related feature requests into comprehensive prompts.
- [ ] Schedule high-credit prompts only after prerequisites are ready.
- [ ] Maintain a live ledger of credits consumed versus milestones.
- [ ] Export outputs frequently to protect prior investments.

### Pricing & Offering Alignment
- [ ] Tie each pricing tier to the credits required to deliver it.
- [ ] Provide transparent credit allocations in client-facing materials.
- [ ] Reserve credits for VIP responsiveness and mentorship prep.
- [ ] Reprice or re-scope tiers if actual usage consistently deviates from plan.

### Mentorship & VIP Delivery
- [ ] Pre-plan mentorship sessions with prep and follow-up credits allocated.
- [ ] Keep a 10–20% credit buffer for VIP escalations.
- [ ] Reuse approved curriculum assets to reduce per-mentee credit costs.
- [ ] Log daily chat touchpoints to monitor support obligations.

Use this playbook to balance build velocity, client value, and credit efficiency across all offerings.
