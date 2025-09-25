#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  banner,
  celebrate,
  divider,
  error as logError,
  info,
  note,
  step,
  success,
} from "./utils/friendly-logger.js";
import { applyBrandingEnvDefaults } from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const { cwd = repoRoot, env: overrides } = options ?? {};
  const env = createSanitizedNpmEnv(overrides ?? {});

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: "inherit",
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code, signal) => {
      if (signal) {
        resolve(1);
        return;
      }
      resolve(code ?? 0);
    });
  });
}

async function main() {
  const { defaultedKeys, resolvedOrigin } = applyBrandingEnvDefaults({
    includeSupabasePlaceholders: false,
  });

  banner(
    "Dynamic Build Suite · Miniapp Deploy",
    "Building and deploying the Supabase mini app with branded defaults.",
  );

  if (defaultedKeys.length > 0) {
    note(
      "Applied fallback branding environment variables for this deployment.",
      {
        details: defaultedKeys,
      },
    );
  } else {
    info(`Branding environment already configured for ${resolvedOrigin}.`);
  }

  divider();
  step("Building mini app bundle...");
  const buildCode = await run(process.execPath, ["scripts/build-miniapp.mjs"]);
  if (buildCode !== 0) {
    logError("Mini app build failed; deployment aborted.");
    process.exit(buildCode);
  }
  success("Mini app bundle ready.");

  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (!projectRef) {
    divider();
    logError("SUPABASE_PROJECT_REF is not set. Unable to deploy functions.");
    process.exit(1);
  }

  divider();
  step("Deploying mini app functions to Supabase...");
  const deployCode = await run(npmCommand, [
    "exec",
    "--yes",
    "supabase",
    "functions",
    "deploy",
    "miniapp",
    "miniapp-deposit",
    "--project-ref",
    projectRef,
  ]);

  if (deployCode !== 0) {
    logError("Supabase deployment failed.");
    process.exit(deployCode);
  }

  success("Mini app and deposit functions deployed.");
  celebrate("Mini app deployment completed successfully.");
}

main().catch((error) => {
  logError("Mini app deployment encountered an unexpected error.", {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
});
