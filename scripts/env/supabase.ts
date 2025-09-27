import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SupabaseSecret = {
  name: string;
  updated_at?: string;
};

type SecretRecord = { name: string; created_at?: string; updated_at?: string };

const SUPABASE_CLI = process.env.SUPABASE_CLI ?? "supabase";

function ensureProjectRef(): { projectRef: string; accessToken: string } {
  const projectRef = process.env.SUPABASE_PROJECT_REF;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!projectRef) {
    throw new Error(
      "Missing SUPABASE_PROJECT_REF for Supabase secret operations.",
    );
  }

  if (!accessToken) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN for Supabase secret operations.",
    );
  }

  return { projectRef, accessToken };
}

async function runSupabaseCommand(args: string[]) {
  const { projectRef, accessToken } = ensureProjectRef();

  const { stdout } = await execFileAsync(SUPABASE_CLI, [
    ...args,
    "--project-ref",
    projectRef,
  ], {
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: accessToken,
    },
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout;
}

export async function listSecrets(): Promise<SupabaseSecret[]> {
  const stdout = await runSupabaseCommand(["secrets", "list", "--json"]);

  const parsed: SecretRecord[] = JSON.parse(stdout);
  return parsed.map(({ name, updated_at }) => ({ name, updated_at }));
}

export async function setSecrets(
  values: Record<string, string>,
): Promise<void> {
  if (!values || Object.keys(values).length === 0) return;

  const entries = Object.entries(values)
    .filter(([key]) => !!key)
    .map(([key, value]) => `${key}=${value}`);

  if (entries.length === 0) return;

  await runSupabaseCommand(["secrets", "set", ...entries]);
}

export async function unsetSecrets(names: string[]): Promise<void> {
  if (!names || names.length === 0) return;
  await runSupabaseCommand(["secrets", "unset", ...names]);
}
