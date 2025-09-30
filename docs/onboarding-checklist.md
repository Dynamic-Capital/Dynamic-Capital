# Dynamic Capital Onboarding Checklist

This checklist standardizes the onboarding flow for new collaborators so that
access, tooling, and communication guardrails are ready before their first
contribution. Copy it into the relevant issue, PR, or project tracker and mark
off items as they are completed. Pair the list with the
[Checklist Directory](./CHECKLISTS.md) for additional automation keys and
project-specific runbooks.

> [!NOTE]
> Assign an onboarding buddy to drive this list. They own cross-functional
> coordination, evidence collection, and status updates back to leadership.

## Quick start overview

| Phase                     | Window         | Driver                                | Evidence to collect                                      |
| ------------------------- | -------------- | ------------------------------------- | -------------------------------------------------------- |
| Pre-boarding              | Week -1        | People Ops + onboarding buddy         | Signed agreements, account invites, security posture log |
| Day 1 foundations         | Day 1          | Onboarding buddy                      | Access confirmation screenshots, tooling install log     |
| First week milestones     | Days 2–5       | New collaborator (with buddy support) | CLI run outputs, first PR link, meeting notes            |
| First month reinforcement | Weeks 2–4      | New collaborator                      | Feature delivery evidence, checklist facilitation recap  |
| Completion                | End of month 1 | Buddy + manager                       | Final sign-off comment and archived checklist link       |

## How to run this checklist

1. **Create an onboarding tracker issue.** Spin up an issue in GitHub or Notion
   titled `Onboarding – <Name>` and paste the checklist below. Add the
   onboarding buddy and hiring manager as assignees so accountability is clear
   from the start.
2. **Define milestone dates up front.** Align on the collaborator's first day,
   end of week one, and 30-day review target. Record the dates in the issue so
   reminders and calendar holds can be scheduled immediately.
3. **Attach evidence in real time.** Every time a task is completed, drop the
   screenshot, CLI output, or document link in the issue with a short note.
   Encourage the new collaborator to contribute their own evidence so they get
   comfortable with the repository tooling quickly.
4. **Run twice-weekly check-ins.** Use a 15-minute sync at the start of the week
   (review outstanding items) and end of the week (capture wins/risks) to keep
   momentum. Convert the outcomes into comments on the issue for the leadership
   record.
5. **Close the loop at completion.** When all sections are checked off, post a
   summary comment that links to the captured evidence, lessons learned, and
   next delivery target. Archive the issue in the onboarding workspace.

### Progress log template

Paste the following table at the top of the onboarding issue to document each
checkpoint and surface blockers before they slow down delivery.

| Date       | Phase / Task Group        | Owner(s)          | Key updates / Evidence                   | Blockers & Next Actions      |
| ---------- | ------------------------- | ----------------- | ---------------------------------------- | ---------------------------- |
| 2025-01-06 | Pre-boarding – accounts   | People Ops, Buddy | GitHub/Notion invites sent               | Awaiting Supabase approval   |
| 2025-01-08 | Day 1 – workspace setup   | New collaborator  | Attached terminal logs for `npm install` | Need Docker Desktop approval |
| 2025-01-13 | Week 1 – first PR shipped | New collaborator  | Linked docs PR #123                      | Schedule deployment shadow   |
| 2025-02-03 | Month 1 – sign-off        | Buddy, Manager    | Added 30-day feedback summary            | Confirm access review invite |

## 1. Pre-boarding (week before start date)

### 1.1 Admin & access provisioning

- [ ] Collect legal name, preferred email, and secure messaging handle (Signal
      or Telegram) for identity records.
- [ ] Send mutual NDA and contributor agreement for signature; archive copies in
      the secure document vault.
- [ ] Create accounts for the following systems (skip if contractor provides
      approved alternatives):
  - [ ] Google Workspace (Dynamic Capital domain)
  - [ ] Notion workspace
  - [ ] GitHub organization invite (assign `dynamic-capital` team)
  - [ ] Linear project workspace (if applicable)
  - [ ] Supabase dashboard (read-only role by default)
- [ ] Provision password manager vault access and share onboarding collection
      (credentials, API tokens, emergency contacts).
- [ ] Request hardware or confirm BYOD security posture (MFA, disk encryption,
      patched OS, endpoint protection) per the
      [Security Playbook](./dynamic-capital-security-playbook.md).
- **Evidence to capture:** Signed agreements filed, list of provisioned
  accounts, and BYOD security confirmation stored in the onboarding issue.

### 1.2 Orientation materials

- [ ] Share the
      [Dynamic Capital Pillars Playbook](./dynamic-capital-pillars-playbook.md)
      and [Values Playbook](./dynamic-capital-values-playbook.md).
- [ ] Share the
      [Dynamic Capital Ecosystem Anatomy](./dynamic-capital-ecosystem-anatomy.md)
      and note relevant domains (e.g. `dynamiccapital.ton`).
- [ ] Flag the [Dynamic Capital Checklist](./dynamic-capital-checklist.md) and
      highlight sections they will own in the first 90 days.
- [ ] Send links to recorded all-hands / roadmap briefings and schedule the
      onboarding walkthrough on day one.
- **Evidence to capture:** Orientation links acknowledged (emoji or comment) and
  walkthrough scheduled on the shared calendar.

## 2. Day 1 foundations

### 2.1 Communication & rituals

- [ ] Confirm access to the core communication stack (Telegram, email, Notion,
      status updates channel) and post the welcome message template.
- [ ] Review weekly/bi-weekly rituals (standups, demos, retro cadence) and add
      to the shared calendar.
- [ ] Introduce the onboarding buddy and immediate collaborators in a welcome
      thread.
- **Evidence to capture:** Welcome thread link and calendar invite screenshots
  (or confirmation comments) attached to the onboarding issue.

### 2.2 Workspace configuration

- [ ] Walk through the [Repository README](../README.md) setup instructions.
- [ ] Install required tooling:
  - [ ] Node.js / pnpm or npm (per repository guidance)
  - [ ] Deno (for scripts and automation)
  - [ ] Supabase CLI (if they will touch database flows)
  - [ ] Docker (optional but recommended for parity with CI containers)
- [ ] Clone the repository and run `npm install` (or `pnpm install`).
- [ ] Copy `.env.example` to `.env` and `.env.local`, then populate secrets via
      the password manager handoff.
- [ ] Run `npm run checklists -- --list` to demonstrate automation coverage and
      highlight the `dynamic-capital`, `setup-followups`, and
      `coding-efficiency` keys.
- [ ] Ensure they can authenticate with Supabase (`npx supabase login`) and
      Tonkeeper (if touching TON integrations) without errors.
- **Evidence to capture:** Screenshot or paste of successful setup commands and
  confirmation that Supabase/Tonkeeper logins completed without errors.

## 3. First week milestones

### 3.1 Technical validation

- [ ] Complete the
      [Setup Follow-Ups](./dynamic-capital-checklist.md#setup-follow-ups)
      automation to verify Supabase linking and CI parity checks.
- [ ] Run repository linters and tests locally (`npm run lint`,
      `npm run
      typecheck`, `npm run test`) and capture output in the
      onboarding issue.
- [ ] Ship a documentation-only PR (e.g.
      [`docs/ton-storage-hosting.md`](./ton-storage-hosting.md)) to exercise the
      review loop end-to-end.
- [ ] Shadow the onboarding buddy during one production deployment or release
      simulation.
- **Evidence to capture:** Attach CLI outputs, lint/test logs, and deployment
  notes (or screen recordings) confirming each validation step.

### 3.2 Domain immersion

- [ ] Schedule 30-minute syncs with leads for trading, automation, security, and
      product to map responsibilities and escalation paths.
- [ ] Review active initiatives in Linear/Notion; align first deliverable with a
      high-priority checklist entry.
- [ ] Tour critical dashboards (Supabase metrics, Telegram admin tools, wallet
      monitors) and record at least one observation or question per area.
- **Evidence to capture:** Meeting notes and dashboard observations consolidated
  in the onboarding issue (include follow-up owners where applicable).

## 4. First month reinforcement

### 4.1 Autonomy checkpoints

- [ ] Deliver a feature or automation update guided by the
      [Coding Efficiency Checklist](./coding-efficiency-checklist.md), including
      evidence of tests and documentation updates.
- [ ] Facilitate one checklist-driven review (choose from the
      [Checklist Directory](./CHECKLISTS.md)) to demonstrate mastery of the
      automation helper.
- [ ] Rotate on-call or alert shadowing (if applicable) and document runbook
      improvements in the relevant playbook.
- **Evidence to capture:** Link to delivered feature PR, checklist facilitation
  summary, and on-call/runbook updates.

### 4.2 Feedback & growth

- [ ] Complete the 30-day feedback loop: collect feedback from onboarding buddy,
      manager, and cross-functional partners; summarize strengths and focus
      areas.
- [ ] Update the onboarding issue with lessons learned, suggested checklist
      tweaks, and resource gaps for future cohorts.
- [ ] Confirm access reviews are scheduled (quarterly) and offboarding
      procedures are understood.
- **Evidence to capture:** 30-day feedback summary, improvement backlog entry,
  and calendar invite for the next access review.

## 5. Completion

- [ ] All tasks checked off and evidence linked in the onboarding issue / PR.
- [ ] Buddy signs off and transitions the new collaborator into regular delivery
      cadences.
- [ ] Archive the completed checklist in the shared onboarding workspace.
- **Evidence to capture:** Final comment in the onboarding issue summarizing
  highlights, blockers resolved, and archive link.
