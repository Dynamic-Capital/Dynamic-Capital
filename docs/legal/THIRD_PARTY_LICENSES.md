# Third-party Licenses

The Dynamic Capital application relies on the following upstream projects. Each
component remains the property of its respective authors and is distributed
under the licenses indicated below. Follow the linked license texts when
reviewing obligations such as copyright notices or attribution requirements.

| Package / Component            | Usage                                                                   | License                                               | Reference                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Next.js                        | Core web application framework                                          | MIT License                                           | https://github.com/vercel/next.js/blob/canary/license.md                                                    |
| React                          | UI library powering the web and mini app clients                        | MIT License                                           | https://github.com/facebook/react/blob/main/LICENSE                                                         |
| Supabase JS SDK & Supabase CLI | Database, authentication, and local development tooling                 | Apache License 2.0                                    | https://github.com/supabase/supabase/blob/master/LICENSE                                                    |
| Dynamic UI                     | Design system tokens and components for the marketing site              | MIT License                                           | https://github.com/once-ui/once-ui/blob/main/LICENSE                                                        |
| Tailwind CSS                   | Utility-first styling used across the landing and dashboard experiences | MIT License                                           | https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE                                             |
| Lucide React                   | Icon set used in the dashboard and mini app                             | ISC License                                           | https://github.com/lucide-icons/lucide/blob/main/LICENSE                                                    |
| Framer Motion                  | Animation primitives for interactive UI elements                        | MIT License                                           | https://github.com/framer/motion/blob/main/LICENSE                                                          |
| TanStack Query                 | Client-side data fetching and caching                                   | MIT License                                           | https://github.com/TanStack/query/blob/main/LICENSE                                                         |
| Inngest                        | Background job orchestration for queue and worker processes             | Apache License 2.0                                    | https://github.com/inngest/inngest-js/blob/main/LICENSE                                                     |
| AWS SDK for JavaScript v3      | DigitalOcean Spaces and S3-compatible uploads                           | Apache License 2.0                                    | https://github.com/aws/aws-sdk-js-v3/blob/main/LICENSE                                                      |
| PostHog JS                     | Product analytics instrumentation                                       | MIT License                                           | https://github.com/PostHog/posthog-js/blob/master/LICENSE                                                   |
| Sonner                         | Toast notifications within the dashboard                                | MIT License                                           | https://github.com/emilkowalski/sonner/blob/main/LICENSE                                                    |
| Auth.js (NextAuth.js)          | End-user authentication and session management                          | ISC License                                           | https://github.com/nextauthjs/next-auth/blob/main/LICENSE                                                   |
| Supabase Auth Helpers & SSR    | Seamless Supabase session handling for React and Next.js                | MIT License                                           | https://github.com/supabase/auth-helpers/blob/main/LICENSE                                                  |
| grammY Telegram Framework      | Telegram bot orchestration including conversations and throttling       | MIT License                                           | https://github.com/grammyjs/grammY/blob/main/LICENSE                                                        |
| Radix UI Primitives            | Accessible headless components underpinning the dashboard UI            | MIT License                                           | https://github.com/radix-ui/primitives/blob/main/LICENSE                                                    |
| Sentry Next.js SDK             | Application monitoring and error tracing                                | MIT License                                           | https://github.com/getsentry/sentry-javascript/blob/develop/LICENSE                                         |
| Drizzle ORM                    | Type-safe database access layer for Supabase Postgres                   | Apache License 2.0                                    | https://github.com/drizzle-team/drizzle-orm/blob/main/LICENSE                                               |
| Zod                            | Runtime validation for API payloads and forms                           | MIT License                                           | https://github.com/colinhacks/zod/blob/master/LICENSE                                                       |
| Tesseract.js                   | Optical character recognition used in receipt processing                | Apache License 2.0                                    | https://github.com/naptha/tesseract.js/blob/master/LICENSE                                                  |
| React Hook Form                | Form state management for onboarding and admin flows                    | MIT License                                           | https://github.com/react-hook-form/react-hook-form/blob/master/LICENSE                                      |
| React Three Fiber & Drei       | 3D scene rendering helpers for marketing visualizations                 | MIT License                                           | https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE                                             |
| @vercel/otel                   | OpenTelemetry instrumentation for server-side observability             | MIT License                                           | https://github.com/vercel/otel/blob/main/LICENSE                                                            |
| DeepSeek-V3 (code & weights)   | Reference adapter and optional checkpoints for DeepSeek trade guidance  | MIT License (code) + DeepSeek Model License (weights) | https://github.com/deepseek-ai/DeepSeek-V3/blob/main/LICENSE (code), https://www.deepseek.com/model-license |

For transitive dependencies bundled through npm or Deno, consult the package
manager manifests (`package-lock.json`, `deno.lock`) or run the relevant license
reporting tools in CI. Requests for additional attribution or a comprehensive
Software Bill of Materials can be directed to `legal@dynamic.capital`.

> **DeepSeek redistribution reminder:** the open-source repository ships under
> MIT, but the model weights are governed by the separate DeepSeek Model License
> Agreement. Obtain approval from legal before mirroring or distributing any
> checkpoints outside the private artifact store.
