#!/usr/bin/env node

import { execSync, spawn } from "node:child_process";
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
  "Codex CLI · Friendly Build Mode",
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

const args = new Set(process.argv.slice(2));
const runSerial = args.has("--serial") ||
  process.env.LOVABLE_BUILD_SERIAL === "1";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const tasks = [
  { label: "Next.js build", command: npmCommand, args: ["run", "build"] },
  {
    label: "Miniapp build",
    command: npmCommand,
    args: ["run", "build:miniapp"],
  },
];

function runTask({ label, command, args: commandArgs }) {
  step(`${label} in progress...`);
  const env = createSanitizedNpmEnv();

  return new Promise((resolve) => {
    let settled = false;

    const finalize = ({ code, signal, error }) => {
      if (settled) return;
      settled = true;

      if (code === 0) {
        success(`${label} completed successfully!`);
      } else {
        const details = [];
        if (signal) {
          details.push(`terminated by signal ${signal}`);
        }
        if (error) {
          details.push(error.message ? error.message : String(error));
        } else if (code !== undefined) {
          details.push(`exited with code ${code}`);
        }

        logError(`${label} failed. Check the output above for details.`, {
          details: details.length > 0 ? details : undefined,
        });
      }

      divider();
      resolve({ label, code: code ?? 1 });
    };

    const child = spawn(command, commandArgs, {
      stdio: "inherit",
      env,
    });

    child.on("error", (error) => {
      finalize({ code: 1, error });
    });

    child.on("close", (code, signal) => {
      if (signal) {
        finalize({ code: 1, signal });
        return;
      }
      finalize({ code: code ?? 1 });
    });
  });
}

divider();
if (runSerial) {
  note("Serial mode requested. Build tasks will run one after another.");
} else {
  info("Running build tasks in parallel to shorten overall build times.");
}

const results = [];
if (runSerial) {
  for (const task of tasks) {
    const result = await runTask(task);
    results.push(result);
  }
} else {
  const parallelResults = await Promise.all(tasks.map((task) => runTask(task)));
  results.push(...parallelResults);
}

const failed = results.filter((result) => result.code !== 0);

if (failed.length === 0) {
  celebrate("All Codex CLI build tasks finished with a smile!");
  process.exitCode = 0;
} else {
  warn("Some build tasks did not finish successfully. Review the logs above.");
  process.exitCode = 1;
}
