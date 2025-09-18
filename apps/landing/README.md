# Landing Snapshot Helper

This workspace no longer ships its own HTML bundle. Instead, it proxies to the
Next.js application in `apps/web` to generate a static snapshot of the landing
experience.

Running:

```bash
npm run build --workspace web
npm run build --workspace landing
```

will build the Next.js app and then capture the rendered homepage into the
repository-level `_static/` directory. The snapshot is what DigitalOcean and
other static hosts serve for the marketing site while the standalone Next.js
server continues to power the authenticated experience.

If the web build fails, the landing build will now keep the previous `_static/`
export (or generate a lightweight placeholder) so the broader pipeline can
continue without losing the last good snapshot.

You can still preview the exported bundle locally:

```bash
npm run build --workspace web
npm run build --workspace landing
npm run start --workspace landing
```

The preview command simply serves the `_static/` directory so you can verify the
captured HTML without running the full Next.js server.
