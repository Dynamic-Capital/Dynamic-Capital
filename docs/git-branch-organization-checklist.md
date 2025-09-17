# Git Branch Organization Checklist

Align the repository's branching strategy with deployable services so each domain can target an isolated branch and traffic can be balanced deliberately. Work through the sections in order and record evidence (command output, screenshots, change logs) for audits and onboarding.

> [!TIP] Keep [`docs/DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md) and related runbooks nearby. Update them as you finalize the branch topology so future contributors inherit the new process.

## Prerequisites & Alignment
- [ ] Confirm the current production state of `main` and freeze non-essential merges until the branch plan is in place.
- [ ] Inventory every deployable surface (Next.js app, Supabase Edge functions, broadcast/queue workers, Go service) and the directories/files they own.
- [ ] Document desired branch naming conventions (e.g., `web/main`, `bot/main`, `broadcast/main`) and the relationship between service branches and `main`.
- [ ] Review CI/CD pipelines and hosting integrations to understand which branches trigger builds, deployments, or domain updates today.
- [ ] Socialize the upcoming change with stakeholders (engineering, ops, compliance) and collect sign-off on the timeline.

## Establish Service Baselines
- [ ] Cut long-lived service branches from the latest `main` commit (`git switch -c web/main`, `bot/main`, `miniapp/main`, `broadcast/main`, `queue/main`, `go-service/main`, etc.).
- [ ] Push each service branch to the remote and configure protections to require review, CI, and fast-forward merges from feature branches.
- [ ] Update code owners or review assignment rules so service experts are automatically requested on their branch PRs.
- [ ] Create README snippets or `docs/` notes describing which directories belong to which service branch for future reference.
- [ ] Validate that `main` remains protected as the integration trunk and record the expected merge direction (service branch → `main`).

## Update Automation & CI/CD
- [ ] Adjust CI workflows to scope tests/builds to the relevant service when a branch with the matching prefix is pushed (e.g., `web/*` runs Next.js build, `bot/*` runs Deno checks).
- [ ] Ensure deployment pipelines or infrastructure-as-code reflect the new branch triggers and environment variables.
- [ ] Add or update status checks that must pass before merging into each service branch and before promoting into `main`.
- [ ] If using automation helpers (e.g., `npm run checklists`), add tasks or keys that reference the new branch-specific routines.
- [ ] Run dry-run builds or deployments from each service branch in a staging environment to validate the pipeline updates.

## Configure Domain Routing & Load Balancing
- [ ] Map long-lived service branches to their target domains/subdomains (e.g., `web/main` → `app.example.com`, `bot/main` → `bot.example.com`).
- [ ] For services requiring blue/green or canary releases, create auxiliary branches (`web/canary`, `bot/blue`) and document how traffic will shift between them.
- [ ] Update CDN, DNS, or load balancer configurations to recognize the new branch endpoints and set initial traffic weights.
- [ ] Verify branch-specific deployments with health checks (including the Go service) before exposing traffic.
- [ ] Capture rollback procedures for each branch/domain pair so you can revert quickly if load tests surface issues.

## Communicate & Train
- [ ] Update onboarding materials (`docs/SETUP_SUMMARY.md`, team handbooks, runbooks) with the branch workflow and naming conventions.
- [ ] Schedule walkthroughs or pair sessions so contributors practice branching from service baselines and promoting back to `main`.
- [ ] Define expectations for integration cadence (e.g., weekly merges from service branches into `main`) and document how conflicts will be resolved.
- [ ] Publish a changelog entry or internal announcement summarizing the new branch structure, domain mappings, and load balancing strategy.
- [ ] Reassess after the first release cycle and iterate on the checklist to capture lessons learned or automation opportunities.
