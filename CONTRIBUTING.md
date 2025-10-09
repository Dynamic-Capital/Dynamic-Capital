# Contributing Guide

We welcome contributions that improve Dynamic Capital's platform, automation, or
documentation. This guide outlines the expectations for filing issues, opening
pull requests, and collaborating with maintainers.

## Code of Conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). Please treat all community members with
respect.

## Getting Started

1. **Fork and clone** the repository.
2. **Install dependencies** with `npm install` (or `pnpm install`).
3. **Run Codex setup** when needed with `npm run codex:post-pull` to sync shared
   assets.
4. **Create a branch** from `main` following the pattern
   `feature/<scope>-<short-description>` or `fix/<scope>-<issue-number>`.

## Development Workflow

- Format code with `npm run format` before committing.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run verify`
  before submitting a PR.
- Keep commits focused. Use conventional commit messages when possible.
- Reference related issues or context directly in your PR description.
- Avoid committing secrets. Use `.env.example` to document new configuration.

## Documentation Updates

- Organize Markdown documents with meaningful headings.
- Use fenced code blocks with language identifiers.
- Update related guides when adding new features or workflows.
- Include diagrams or tables from the `/docs` or `/content` directories when
  they clarify architecture changes.

## Testing Expectations

| Area             | Command                       | Notes                                    |
| ---------------- | ----------------------------- | ---------------------------------------- |
| Linting          | `npm run lint`                | Required for all PRs                     |
| Type Checking    | `npm run typecheck`           | Ensure no `any` creep                    |
| Unit/Integration | `npm run test`                | Run targeted packages when possible      |
| Formatting       | `npm run format -- --check`   | CI will fail if formatting is incorrect  |
| Full-stack       | `npm run verify`              | Aggregates static export, Telegram, and edge simulations |

## Pull Request Checklist

- [ ] Tests and checks pass locally.
- [ ] Documentation is updated (including `_static/` snapshots if UI changed).
- [ ] Security considerations are documented for sensitive changes.
- [ ] Screenshots or recordings attached for UI updates when applicable.
- [ ] PR description references related issues or support tickets.

## Review Process

1. Submit your PR and request reviewers via CODEOWNERS assignments.
2. Provide context on decisions, trade-offs, and validation steps.
3. Respond to review feedback within two business days.
4. Maintainers will merge once approvals and required checks are satisfied.

## Release Workflow

- Tag releases with `v<major>.<minor>.<patch>` using semantic versioning.
- Update changelogs or release notes in `docs/releases/`.
- Coordinate with the operations team before deploying production-critical
  services.

## Security and Compliance

- Follow the disclosure process in [SECURITY.md](SECURITY.md).
- Request access reviews for new secrets or permissions.
- Notify `security@DynamicCapital.ton` of any vulnerabilities encountered
  during development, even if already mitigated.

## Support

For help or pairing requests, open a discussion in GitHub or email the
maintainers at [devrel@DynamicCapital.ton](mailto:devrel@DynamicCapital.ton).
