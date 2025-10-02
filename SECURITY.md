# Security Policy

## Supported Versions

Security fixes are released only for the latest code on the `main` branch.
Deployments should track the current commit to receive patches.

| Version | Supported |
| ------- | --------- |
| main    | ✅        |
| < main  | ❌        |

## Reporting a Vulnerability

Report security issues privately through this repository's GitHub Security
Advisories (Security → Report a vulnerability). Maintainers monitor this channel
and will acknowledge reports within **72 hours**.

After verification, we aim to ship a fix within **14 days** and will keep you
informed of progress. Once resolved, we coordinate disclosure and credit the
reporter if desired.

## Alternative Contact

If you cannot use GitHub Security Advisories, send an encrypted email to
[security@example.com](mailto:security@example.com) using the PGP key below.

**PGP Key Fingerprint:** `A1B2 C3D4 E5F6 7890 1234 5678 9ABC DEF0 1234 5678`

Download the key from <https://example.com/security-pgp-key.asc>. We require
reports via email to be encrypted; unencrypted submissions may be ignored. We'll
acknowledge receipt within **72 hours** and aim to resolve verified issues
within **14 days**.

This security address is actively monitored by the maintainers.

## Exposure Response Playbooks

Dynamic Capital maintains focused remediation guides for high-risk incidents.
Refer to [docs/security/telegram-data-exposure-response.md](docs/security/telegram-data-exposure-response.md)
for the containment and recovery plan addressing leaked Telegram identifiers,
student records, and related anonymous access concerns. Follow repository
checklists alongside the playbook to ensure timely notification and hardening
activities.
