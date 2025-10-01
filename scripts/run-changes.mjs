#!/usr/bin/env node
import { spawn } from "node:child_process";
import process from "node:process";

const args = new Set(process.argv.slice(2));

let skipVerify = args.has("--skip-verify");
let skipBuild = args.has("--skip-build");
let skipAnalyze = args.has("--skip-analyze");

if (args.has("--verify-only")) {
  skipBuild = true;
  skipAnalyze = true;
}

if (args.has("--analyze-only")) {
  skipVerify = true;
  skipBuild = true;
  skipAnalyze = false;
}

const helpRequested = args.has("--help") || args.has("-h");

if (helpRequested) {
  console.log(
    `Dynamic Capital change runner\n\n` +
      `Usage: npm run changes [options]\n\n` +
      `Options:\n` +
      `  --skip-verify     Skip the verification suite\n` +
      `  --skip-build      Skip the production build\n` +
      `  --skip-analyze    Skip the bundle analyzer build\n` +
      `  --verify-only     Run only the verification suite\n` +
      `  --analyze-only    Run only the analyzer build\n` +
      `  -h, --help        Show this help text\n`,
  );
  process.exit(0);
}

const steps = [];

const pushStep = (title, command, env = {}) => {
  steps.push({
    title,
    command,
    env,
  });
};

if (!skipVerify) {
  pushStep("Verification suite", ["npm", ["run", "verify"]]);
}

if (!skipBuild) {
  pushStep("Production build", ["npm", ["run", "build"]]);
}

if (!skipAnalyze) {
  pushStep("Bundle analyzer build", ["npm", ["run", "build:web"]], {
    ANALYZE: "true",
  });
}

if (steps.length === 0) {
  console.log("No steps selected. Use --help for options.");
  process.exit(0);
}

const runStep = (step) =>
  new Promise((resolve, reject) => {
    console.log(`\n▶ ${step.title}`);
    const [command, args] = step.command;
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        ...step.env,
      },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`✔ ${step.title} completed`);
        resolve();
      } else {
        reject(new Error(`${step.title} exited with code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });

const run = async () => {
  for (const step of steps) {
    await runStep(step);
  }

  console.log("\nAll selected steps completed successfully.");
};

run().catch((error) => {
  console.error(`\n✖ ${error.message}`);
  process.exit(1);
});
