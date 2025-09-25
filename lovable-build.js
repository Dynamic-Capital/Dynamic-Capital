#!/usr/bin/env node

import { execSync } from "node:child_process";
import {
  banner,
  celebrate,
  divider,
  error as logError,
  info,
  note,
  step,
  success,
  warn,
} from "./scripts/utils/friendly-logger.js";
import { createSanitizedNpmEnv } from "./scripts/utils/npm-env.mjs";
import {
  applyBrandingEnvDefaults,
  PRODUCTION_ALLOWED_ORIGINS,
  PRODUCTION_ORIGIN,
} from "./scripts/utils/branding-env.mjs";

const {
  defaultedKeys,
  lovableOriginDefaulted,
  resolvedOrigin,
  supabaseFallbacks,
} = applyBrandingEnvDefaults({
  allowedOrigins: PRODUCTION_ALLOWED_ORIGINS,
  fallbackOrigin: PRODUCTION_ORIGIN,
});

banner(
  "Dynamic Build Suite · Friendly Build Mode",
  "Running Dynamic build tasks with cheerful updates.",
);
info(`Resolved origin preference: ${resolvedOrigin}`);

if (defaultedKeys.length > 0) {
  warn(
    "Origin variables were missing. Applying defaults to keep builds consistent.",
    {
      details: defaultedKeys,
    },
  );
} else {
  success("All origin-related environment variables are ready to go.");
}

if (lovableOriginDefaulted) {
  note(
    `LOVABLE_ORIGIN defaulted to ${resolvedOrigin} so Dynamic previews match the build.`,
  );
} else {
  info(
    `LOVABLE_ORIGIN already configured as ${process.env.LOVABLE_ORIGIN} for Dynamic previews.`,
  );
}

if (supabaseFallbacks.length > 0) {
  note(
    "Supabase credentials are not configured; placeholder values will be used for local build helpers.",
    {
      details: supabaseFallbacks,
    },
  );
}

divider();
step("Ensuring required environment variables are present...");
try {
  execSync("npx tsx scripts/check-env.ts", {
    stdio: "inherit",
    env: createSanitizedNpmEnv(),
  });
  success("Environment check passed.");
} catch (error) {
  logError("Environment check failed. Fix the issues above before building.", {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
}

const tasks = [
  { cmd: "npm run build", label: "Next.js build" },
  { cmd: "npm run build:miniapp", label: "Miniapp build" },
];

divider();
let exitCode = 0;
for (const { cmd, label } of tasks) {
  step(`${label} in progress...`);
  try {
    execSync(cmd, {
      stdio: "inherit",
      env: createSanitizedNpmEnv(),
    });
    success(`${label} completed successfully!`);
  } catch (error) {
    logError(`${label} failed. Check the output above for details.`, {
      details: error?.message ? [error.message] : undefined,
    });
    exitCode = 1;
  }
  divider();
}

if (exitCode === 0) {
  celebrate("All Dynamic Build Suite tasks finished with a smile!");
} else {
  warn("Some build tasks did not finish successfully. Review the logs above.");
}

process.exitCode = exitCode;
