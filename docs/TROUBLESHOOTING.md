# Troubleshooting

This guide covers a few common problems and their fixes when working with the project.

## React context usage error
- **Reason:** A TypeError occurs during prerendering because a component uses a React context before the provider is ready.
- **Solution:** Ensure every component that calls a context hook is wrapped in the matching provider. In Next.js, double‑check that client components using context are nested under `app/providers.tsx` so the providers are initialized for both server‑ and client‑side rendering.

## Build cache corruption
- **Reason:** The Next.js build cache can occasionally become corrupted, leading to unexpected compilation failures.
- **Solution:** Remove the `.next` directory and run a fresh build:
  ```bash
  rm -rf apps/web/.next
  npm run build:web
  ```

## CORS configuration warning
- **Reason:** Missing `ALLOWED_ORIGINS` prevents the server from correctly configuring CORS headers.
- **Solution:** Set the environment variable to a comma‑separated list of allowed origins:
  ```bash
  export ALLOWED_ORIGINS="https://example.com,https://another.com"
  ```
  If the variable is omitted, the system defaults to `http://localhost:3000` and logs a warning.
