<!-- deno-fmt-ignore-file -->

# NPM Dependency Audit — 2025-10-12

## Summary

- **Command:** `npm run audit`
- **Node version:** `v20.19.4`
- **Result:** npm reported zero known vulnerabilities across dependencies.
- **Warnings:** npm emitted `Unknown env config "http-proxy"` before and during the audit run. This repository currently relies on that environment entry, but the warning notes the setting will stop working in the next major npm release.

## Command Output

```bash
$ npm run audit
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
> audit
> npm audit
npm warn Unknown env config "http-proxy". This will stop working in the next major version of npm.
found 0 vulnerabilities
```

## Follow-up Recommendations

1. **Clean up npm environment configuration:** Update the developer and CI npm configuration to replace or remove the deprecated `http-proxy` entry before npm 12, so future audits and installs do not fail once the option is removed.
2. **Schedule recurring audits:** Continue to run `npm run audit` on a regular cadence (e.g., weekly or during release preparation) to detect upstream dependency vulnerabilities promptly.
3. **Capture audit status in release notes:** When shipping releases, include the latest audit timestamp and result so stakeholders can verify dependency hygiene alongside other operational checks.
