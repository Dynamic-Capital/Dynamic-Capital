import { spawn } from "node:child_process";
import process from "node:process";

interface ServeOptions {
  envFile?: string;
  functions: string[];
}

function parseArgs(argv: string[]): ServeOptions {
  const functions: string[] = [];
  let envFile: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--env-file") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("--env-file flag requires a path");
      }
      envFile = next;
      index += 1;
      continue;
    }
    if (value.startsWith("-")) {
      throw new Error(`Unknown flag: ${value}`);
    }
    functions.push(value);
  }

  return { envFile, functions };
}

function requireProjectRef(): string {
  const ref = process.env.PROJECT_REF ?? process.env.SUPABASE_PROJECT_REF;
  if (!ref) {
    throw new Error(
      "Set PROJECT_REF or SUPABASE_PROJECT_REF before serving functions",
    );
  }
  return ref;
}

function buildArgs(options: ServeOptions, projectRef: string): string[] {
  const args = [
    "supabase",
    "functions",
    "serve",
    "--project-ref",
    projectRef,
    "--no-verify-jwt",
  ];
  if (options.envFile) {
    args.push("--env-file", options.envFile);
  }
  if (options.functions.length > 0) {
    args.push(...options.functions);
  }
  return args;
}

function runSupabase(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`[serve:functions] npx ${args.join(" ")}`);
    const child = spawn("npx", args, {
      stdio: "inherit",
      env,
    });
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`supabase CLI exited with code ${code}`));
      }
    });
    child.on("error", (error) => rejectPromise(error));
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const projectRef = requireProjectRef();
  const args = buildArgs(options, projectRef);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PROJECT_REF: projectRef,
    SUPABASE_PROJECT_REF: projectRef,
  };
  await runSupabase(args, env);
}

main().catch((error) => {
  console.error("[serve:functions] Failed to start Supabase functions server");
  console.error(error);
  process.exitCode = 1;
});
