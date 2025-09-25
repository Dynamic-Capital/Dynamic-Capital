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
  warn,
} from "./utils/friendly-logger.js";
import { applyBrandingEnvDefaults } from "./utils/branding-env.mjs";
import { createSanitizedNpmEnv } from "./utils/npm-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const miniappDir = join(repoRoot, "supabase", "functions", "miniapp");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  const { env: overrides, cwd = miniappDir } = options ?? {};
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

async function runAssertBundle() {
  const env = createSanitizedNpmEnv();
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/assert-miniapp-bundle.mjs"],
      {
        cwd: repoRoot,
        env,
        stdio: "inherit",
      },
    );

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
    "Dynamic Build Suite · Miniapp Builder",
    "Compiling the Telegram mini app with branded defaults.",
  );

  if (defaultedKeys.length > 0) {
    note(
      "Applied fallback branding environment variables for the mini app workspace.",
      {
        details: defaultedKeys,
      },
    );
  } else {
    info(`Branding environment already configured for ${resolvedOrigin}.`);
  }

  divider();
  step("Installing mini app dependencies...");
  const installCode = await run(npmCommand, ["ci"]);
  if (installCode !== 0) {
    logError("Dependency installation failed for the mini app workspace.");
    process.exit(installCode);
  }
  success("Dependencies installed.");

  divider();
  step("Building mini app assets...");
  const buildCode = await run(npmCommand, ["run", "build"]);
  if (buildCode !== 0) {
    logError("Mini app build failed.");
    process.exit(buildCode);
  }
  success("Mini app bundle generated.");

  divider();
  step("Running bundle assertions...");
  const assertCode = await runAssertBundle();
  if (assertCode !== 0) {
    warn("Bundle assertions reported issues. Review the output above.");
    process.exit(assertCode);
  }
  success("Bundle assertions passed.");

  celebrate("Mini app build complete and ready for deployment.");
}

main().catch((error) => {
  logError("Mini app build encountered an unexpected error.", {
    details: error?.message ? [error.message] : undefined,
  });
  process.exit(1);
});
