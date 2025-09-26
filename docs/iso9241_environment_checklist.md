# ISO 9241 Environment Alignment Checklist

Use this checklist when auditing Dynamic Codex workflows that touch deployment
pipelines, configuration, or release branches. It references ISO 9241-110
principles (suitability for the task, self-descriptiveness, controllability,
consistency, error tolerance, suitability for learning) to keep the developer
experience ergonomic.

## Environments

- [ ] Document the purpose of each environment (development, staging,
      production, and optional preview sandboxes) so contributors know which
      surface to use for a given task.
- [ ] Confirm staging mirrors production configuration closely enough to produce
      trustworthy results before promoting a release.
- [ ] Restrict destructive operations (database migrations, feature flag flips)
      to staging and production environments with clear escalation paths.

## Branches

- [ ] Ensure `main` maps to production deployments and that staging releases
      flow from a stabilized branch (`develop`, `release/*`, or equivalent).
- [ ] Keep feature branches short-lived and merge them through pull requests
      with required reviews or checks to enforce error tolerance.
- [ ] Update onboarding docs with the latest branch-to-environment mapping so
      new collaborators can learn the workflow quickly.

## Builds

- [ ] Verify CI builds produce distinct outputs for development, staging, and
      production contexts with the right logging, debugging, and optimization
      levels.
- [ ] Enable preview builds (per pull request or feature branch) when
      stakeholders need isolated URLs for review without blocking staging.
- [ ] Label build artifacts and deployment targets clearly (preview, staging,
      production) across dashboards and release notes.

## Environment configuration

- [ ] Store secrets and configuration values in environment-specific files or
      secret manager entries (e.g., `.env.development`, `.env.staging`,
      `.env.production`).
- [ ] Separate public (`NEXT_PUBLIC_*`) and private secrets to match security
      expectations for client vs. server usage.
- [ ] Audit access controls so only authorized operators can modify production
      configuration, and record rotation procedures for sensitive keys.

Re-run this checklist whenever the deployment topology or branching policy
changes to keep Codex exports aligned with ISO 9241 guidance.
