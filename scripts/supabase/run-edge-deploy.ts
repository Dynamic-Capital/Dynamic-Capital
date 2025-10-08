import { spawn } from "node:child_process";
import process from "node:process";

interface DeployOptions {
  preset: "core" | "ops" | "all";
}

const CORE_TASKS = [
  "edge:deploy:verify",
  "edge:deploy:health",
  "edge:deploy:analytics",
  "edge:deploy:bot",
  "edge:deploy:mini",
  "edge:deploy:checkout",
  "edge:deploy:uploadurl",
  "edge:deploy:receipt",
  "edge:deploy:review",
  "edge:deploy:ref",
  "edge:deploy:funnel",
  "edge:deploy:promo",
];

const OPS_TASKS = [
  "edge:deploy:ops",
  "edge:deploy:admin-check",
  "edge:deploy:admin-list",
  "edge:deploy:admin-act",
  "edge:deploy:admin-logs",
  "edge:deploy:security",
  "edge:deploy:auto",
  "edge:deploy:cron",
  "edge:deploy:sync",
  "edge:deploy:smoke",
  "edge:deploy:broadcast",
];

function parseArgs(argv: string[]): DeployOptions {
  const presetArg = argv[0] as DeployOptions["preset"] | undefined;
  if (!presetArg) {
    return { preset: "all" };
  }
  if (presetArg === "core" || presetArg === "ops" || presetArg === "all") {
    return { preset: presetArg };
  }
  throw new Error(`Unknown preset "${presetArg}". Use one of: core, ops, all.`);
}

function requireProjectRef(): string {
  const ref = process.env.PROJECT_REF ?? process.env.SUPABASE_PROJECT_REF;
  if (!ref) {
    throw new Error(
      "Set PROJECT_REF or SUPABASE_PROJECT_REF before deploying edge functions",
    );
  }
  return ref;
}

function uniqueTasks(tasks: string[]): string[] {
  return [...new Set(tasks)];
}

function resolveTasks(preset: DeployOptions["preset"]): string[] {
  if (preset === "core") {
    return uniqueTasks(CORE_TASKS);
  }
  if (preset === "ops") {
    return uniqueTasks(OPS_TASKS);
  }
  return uniqueTasks([...CORE_TASKS, ...OPS_TASKS]);
}

function runTask(task: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`\n[deploy:edge] Running deno task ${task}`);
    const child = spawn("deno", ["task", task], {
      stdio: "inherit",
      env,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`deno task ${task} exited with code ${code}`));
      }
    });
    child.on("error", (error) => rejectPromise(error));
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const projectRef = requireProjectRef();
  const tasks = resolveTasks(options.preset);

  if (!tasks.length) {
    console.log("No edge deployment tasks configured.");
    return;
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PROJECT_REF: projectRef,
    SUPABASE_PROJECT_REF: projectRef,
  };

  for (const task of tasks) {
    await runTask(task, env);
  }

  console.log(
    `\n[deploy:edge] Completed ${tasks.length} deployment task${
      tasks.length === 1 ? "" : "s"
    }.`,
  );
}

main().catch((error) => {
  console.error("[deploy:edge] Deployment failed");
  console.error(error);
  process.exitCode = 1;
});
