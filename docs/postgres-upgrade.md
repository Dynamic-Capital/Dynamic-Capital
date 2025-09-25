# PostgreSQL Upgrade

The database was flagged for missing recent security patches. Upgrade the
PostgreSQL server to the latest patched release for its major version.

## Recommended Steps

1. Check current version:
   ```sql
   SELECT version();
   ```
2. Review [PostgreSQL release notes](https://www.postgresql.org/docs/release/)
   and choose the latest patch in the deployed major version (e.g. 15.x).
3. Follow your hosting provider's guidance to perform the upgrade. If your
   project runs on Supabase, follow their upgrade guide:
   <https://supabase.com/docs/guides/platform/upgrading>.
4. Run regression tests and verify application functionality.
5. Document the new version in deployment records.

Keeping PostgreSQL updated ensures known vulnerabilities are patched and
security fixes are applied promptly.
