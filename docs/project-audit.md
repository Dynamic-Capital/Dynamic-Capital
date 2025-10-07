# Dynamic Capital Project Audit

## Executive Summary

- **Scope:** High-level review of the JavaScript/TypeScript monorepo, focusing
  on dependency health, tooling readiness, and operational risk areas.
- **Finding Overview:** Detected two high-severity dependency vulnerabilities
  inherited through the `ton` package's axios version. Observed strong tooling
  coverage but noted missing automation around dependency updates and security
  enforcement.
- **Recommended Priority Actions:** Plan a controlled upgrade path for `ton` (or
  replace axios dependency), formalize regular security scans in CI, and
  document ownership for the numerous `dynamic_*` packages.

## Dependency Health

| Check       | Result                    | Notes                                                                                                                   |
| ----------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm audit` | ⚠️ 2 high-severity issues | Vulnerable `axios` version (<= 0.30.1) pulled by `ton`; remediation currently requires a breaking `ton@6.13.1` upgrade. |

### Remediation Guidance

1. **Evaluate `ton` upgrade impact.** Review changelog for versions newer than
   the currently pinned release and validate compatibility with dependent
   modules (wallet flows, TON integrations).
2. **Mitigate interim risk.** If the `ton` upgrade is blocked, consider
   isolating the vulnerable axios instance by proxying TON requests through a
   hardened service or applying network-layer mitigations.
3. **Automate ongoing checks.** Add `npm audit` (or an equivalent GitHub
   Advisory scan) to the CI pipeline so regressions surface before release.

## Tooling & Automation

- The monorepo centralizes scripts in `scripts/` and exposes comprehensive npm
  scripts (`lint`, `typecheck`, `verify`, `docs:*`, `proj:*`). This facilitates
  reproducible workflows but can overwhelm new contributors without a task
  index.
- Recommended action: maintain a curated onboarding checklist in `docs/` that
  links the most critical scripts for web/app developers and operations
  engineers.

## Operational Risks & Observations

- **Package Sprawl:** The repository houses dozens of `dynamic_*` domains
  spanning AI, networking, and finance. Establish or update CODEOWNERS mappings
  per domain to ensure clear review responsibility.
- **Documentation Consistency:** Existing guides (e.g., Phoenix log event
  documentation) are helpful. Expanding the same operational rigor to other
  services would improve institutional knowledge.
- **Security Posture:** No dedicated `SECURITY.md` automation is evident. Pair
  the existing policy with periodic threat modeling reviews for
  blockchain-facing modules (`dynamic_wallet`, `dynamic_trading_language`).

## Next Steps Checklist

- [ ] Approve or schedule the `ton` upgrade after dependency testing.
- [ ] Integrate automated vulnerability scanning into CI workflows.
- [ ] Create or update ownership documentation for the `dynamic_*` subprojects.
- [ ] Produce onboarding guidance covering core scripts and verification steps.

## Appendix

- Audit executed on Node.js workspace root. See command output captured via
  `npm audit` for detailed CVE references.
