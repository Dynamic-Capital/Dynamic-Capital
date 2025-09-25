# Mini App on Supabase (Project your-project-ref)

## Build & Deploy (functions host)

```bash
deno task miniapp:deploy
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase secrets set MINI_APP_URL=https://your-project-ref.functions.supabase.co/miniapp/
npx supabase functions deploy telegram-bot
deno task miniapp:check
```

### One-command workflow

To automate the full sequence (build → link → secrets → deploy → verify), run:

```bash
scripts/link-supabase-project.sh
```

The script infers the project ref from `supabase/config.toml`. Override it via
`SUPABASE_PROJECT_REF=...` and provide a custom `MINI_APP_URL` if needed.

### Custom Domain (later)

Create/verify/activate a custom domain in Supabase, then switch:

```bash
npx supabase secrets set MINI_APP_URL=https://mini.dynamic.capital/functions/v1/miniapp/
npx supabase functions deploy telegram-bot
```
