# Dynamic Capital Mini App

Telegram Mini App implementing a glassmorphism UI for simple deposit flows.
Built with **Dynamic Codex** integration for enhanced development experience.

## Development Process Overview

| Tool                   | What It Does                                          | How You Use It                                                                    |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Dynamic (Platform)** | Hosts the web app and provides a Supabase backend     | Manage environment variables and monitor deployments via the Dynamic console      |
| **Dynamic (AI)**       | Generates scaffolding and high-level feature guidance | Use the chat interface to bootstrap components and features                       |
| **Telegram/BotFather** | Configures the bot and links it to the mini app       | Use commands like `/setmenubutton` to point the bot at the Dynamic deployment URL |
| **Codex CLI**          | Helps with local code-level tasks                     | Run terminal commands for UI tweaks, refactors, and feature additions             |
| **GitHub**             | Version control and deployment trigger                | Push changes to GitHub to have Dynamic rebuild and redeploy                       |

## Dynamic Codex Integration

This Mini App is developed using **Dynamic Codex** for AI-powered development:

### Development Features

- **Visual Edits**: Click the Edit button in Dynamic's interface for instant UI
  changes
- **Chat-driven Development**: Describe features in natural language
- **Real-time Preview**: See changes immediately in the live preview
- **Component Architecture**: Modular, reusable components throughout

### UI Development Workflow

1. **Use Visual Edits** for quick text, color, and font changes
2. **Chat Interface** for complex functionality and layout modifications
3. **Real-time Testing** with live preview window
4. **AI Debugging** with console log access and error detection

### Best Practices with Codex

- Request small, incremental changes for better results
- Use Visual Edits for simple changes to save credits
- Test each modification before requesting additional features
- Leverage AI debugging tools before manual code editing

## Development

```
npm install
npm run dev
```

The app lives under `supabase/functions/miniapp`. It relies on existing Edge
Function endpoints:

- `POST /api/intent` for creating bank/crypto intents
- `POST /api/receipt` for uploading deposit receipts
- `POST /api/crypto-txid` for submitting crypto transactions
- `GET /api/receipts` for recent receipts

SVG placeholders live in `supabase/functions/miniapp/static/img` for the logo,
bank tiles and QR frame; replace them with production assets as needed.

## Design System & Components

### Glassmorphism Theme

- **Dynamic Glass** theme with glassmorphism effects
- **1:1 aspect ratio** for all assets
- **Semantic design tokens** for consistent theming
- **Dark/Light mode** support with automatic switching

### Component Library

Components are built with Dynamic Codex's component architecture:

- `PrimaryButton` - Main action buttons
- `SecondaryButton` - Secondary actions
- `ApproveButton` - Approval workflows
- `RejectButton` - Rejection workflows
- `GlassPanel` - Glassmorphism containers
- `StatusPill` - Status indicators

## Icons

Buttons such as `PrimaryButton`, `SecondaryButton`, `ApproveButton`, and
`RejectButton` accept an optional `icon` prop. For a consistent look, import
icons from the [Heroicons React](https://github.com/tailwindlabs/heroicons)
package:

```bash
npm install @heroicons/react
```

```tsx
import { CheckIcon } from "@heroicons/react/24/solid";
import PrimaryButton from "./src/components/PrimaryButton";

<PrimaryButton label="Continue" icon={<CheckIcon className="h-4 w-4" />} />;
```

Any `ReactNode` can be supplied if you prefer another icon library.

## Supabase Invocation

Supabase exposes this edge function at `/functions/v1/miniapp`, while the
handler normalizes the path so the same code can serve requests addressed to
`/miniapp` during local development or testing.

### Usage

```bash
# Local Supabase CLI
curl http://127.0.0.1:54321/functions/v1/miniapp/

# Production (replace PROJECT_REF with your project ref)
curl https://PROJECT_REF.supabase.co/functions/v1/miniapp/
```

### Tests

Path handling is covered by `tests/miniapp-edge-host-routing.test.ts` and the
live reachability check in
`supabase/functions/_tests/integration_smoke_test.ts`.

## Storage Hosting

When hosting this mini app via Supabase Storage, set the object metadata
explicitly:

- `index.html` → `text/html; charset=utf-8`
- `assets/app.css` → `text/css`
- `assets/app.js` → `text/javascript`

## Required Secrets

The edge function needs the following secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MINIAPP_BUCKET`
- `MINIAPP_INDEX_KEY`
- `MINIAPP_ASSETS_PREFIX`
- `SERVE_FROM_STORAGE=true`
- `MINIAPP_CACHE_LIMIT` (optional, defaults to 100)

## GitHub Integration

This Mini App features **bidirectional GitHub sync** through Dynamic Codex:

- Changes in Codex automatically sync to GitHub
- Real-time collaboration with version control
- Built-in rollback capabilities
- CI/CD integration for deployment

## Debugging & Monitoring

With Dynamic Codex integration:

- **Console Access**: Real-time console log monitoring
- **Network Inspection**: API call monitoring and debugging
- **Error Detection**: Automatic error identification and suggested fixes
- **Performance Tracking**: Component optimization recommendations

For development assistance, use the chat interface to request debugging help or
code explanations.
