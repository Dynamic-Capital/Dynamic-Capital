import { createClient } from "../_shared/client.ts";
import { json, ok, oops } from "../_shared/http.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
const GITHUB_REPO = Deno.env.get("GITHUB_REPO"); // format: owner/name
const DEFAULT_BRANCH = Deno.env.get("GITHUB_DEFAULT_BRANCH") ?? "main";

export const handler = registerHandler(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient();

    if (req.method === "POST") {
      const { action } = await req.json();

      switch (action) {
        case "cleanup_duplicate_files": {
          // Run cleanup task
          const cleanupResult = await performGitHubCleanup(supabase);
          return ok({
            message: "GitHub cleanup completed",
            result: cleanupResult,
          });
        }

        case "get_cleanup_status":
          return await getCleanupStatus(supabase);

        default:
          return json({ ok: false, error: "Invalid action" }, 400);
      }
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GitHub cleanup error:", error);
    return oops("Internal server error", message);
  }
});

async function performGitHubCleanup(supabase: any) {
  console.log("🧹 Starting GitHub cleanup process...");

  try {
    if (!GITHUB_PAT || !GITHUB_REPO) {
      throw new Error("Missing GITHUB_PAT or GITHUB_REPO");
    }
    const [owner, repo] = GITHUB_REPO.split("/");

    // Log cleanup start
    await supabase.from("admin_logs").insert({
      action_type: "github_cleanup_start",
      action_description: "Started automated GitHub cleanup process",
    });

    const tree = await fetchRepoTree(owner, repo);
    const duplicateFiles = identifyDuplicateFiles(tree);
    const unusedFiles = identifyUnusedFiles(tree);
    const filesToRemove = [...duplicateFiles, ...unusedFiles];

    await createCleanupBranchAndPR(owner, repo, filesToRemove);

    const cleanupSummary = {
      duplicate_files: duplicateFiles,
      unused_files: unusedFiles,
      total_removable: filesToRemove.length,
      cleanup_date: new Date().toISOString(),
    };

    // Store cleanup analysis results
    await supabase.from("kv_config").upsert({
      key: "github_cleanup_analysis",
      value: cleanupSummary,
    });

    console.log(
      `🔍 Analysis complete: ${cleanupSummary.total_removable} files identified for cleanup`,
    );

    // Log cleanup completion
    await supabase.from("admin_logs").insert({
      action_type: "github_cleanup_complete",
      action_description:
        `Cleanup analysis complete: ${cleanupSummary.total_removable} files identified`,
    });

    return cleanupSummary;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ GitHub cleanup failed:", error);

    await supabase.from("admin_logs").insert({
      action_type: "github_cleanup_error",
      action_description: `Cleanup failed: ${message}`,
    });

    throw error;
  }
}

async function fetchRepoTree(owner: string, repo: string) {
  const resp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${DEFAULT_BRANCH}?recursive=1`,
    {
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        "User-Agent": "github-cleanup-function",
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch repository tree: ${resp.status}`);
  }
  const data = await resp.json();
  return data.tree.filter((item: any) => item.type === "blob");
}

function identifyDuplicateFiles(tree: any[]): string[] {
  console.log("🔍 Identifying duplicate files...");
  const nameMap = new Map<string, string[]>();
  for (const file of tree) {
    const base = file.path.split("/").pop();
    if (!base) continue;
    const arr = nameMap.get(base) ?? [];
    arr.push(file.path);
    nameMap.set(base, arr);
  }
  return Array.from(nameMap.values()).filter((list) => list.length > 1).flat();
}

function identifyUnusedFiles(tree: any[]): string[] {
  console.log("🔍 Identifying unused files...");
  const patterns = [/\.backup\./, /\.old\./, /_old\./, /_backup\./];
  return tree
    .map((f: any) => f.path)
    .filter((path: string) => patterns.some((re) => re.test(path)));
}

async function createCleanupBranchAndPR(
  owner: string,
  repo: string,
  files: string[],
) {
  if (files.length === 0) {
    return;
  }
  const branchName = `cleanup/${Date.now()}`;

  // Get latest commit on default branch
  const refResp = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${DEFAULT_BRANCH}`,
    {
      headers: {
        Authorization: `token ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!refResp.ok) throw new Error("Failed to fetch branch reference");
  const refData = await refResp.json();
  await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `token ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha,
    }),
  });

  // Delete up to five files to keep runtime small
  const tree = await fetchRepoTree(owner, repo);
  for (const path of files.slice(0, 5)) {
    const file = tree.find((f: any) => f.path === path);
    if (!file) continue;
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `token ${GITHUB_PAT}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          message: `chore: remove unused file ${path}`,
          branch: branchName,
          sha: file.sha,
        }),
      },
    );
  }

  await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      Authorization: `token ${GITHUB_PAT}`,
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      title: "chore: remove unused files",
      head: branchName,
      base: DEFAULT_BRANCH,
      body: `Removed ${
        files.slice(0, 5).length
      } files identified as duplicates or unused.`,
    }),
  });
}

async function getCleanupStatus(supabase: any) {
  try {
    const { data: analysis } = await supabase
      .from("kv_config")
      .select("value")
      .eq("key", "github_cleanup_analysis")
      .maybeSingle();

    if (!analysis?.value) {
      return ok({
        status: "not_started",
        message: "No cleanup analysis found",
      });
    }

    return ok({ status: "completed", analysis: analysis.value });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Error fetching cleanup status:", error);
    return oops("Failed to fetch cleanup status", message);
  }
}

// Recommended file structure for clean organization
const RECOMMENDED_STRUCTURE = {
  keep: [
    // Core application files
    "app/**",
    "app/globals.css",
    "tailwind.config.ts",
    "next.config.mjs",
    "tsconfig.json",
    "package.json",

    // Essential components
    "components/ui/**", // shadcn components
    "components/layout/**", // Layout components
    "components/navigation/**", // Navigation
    "components/admin/ContactInfo.tsx", // Active admin components

    // App router pages
    "app/page.tsx",
    "app/**/page.tsx",

    // Core hooks and utilities
    "hooks/**",
    "lib/**",
    "integrations/supabase/**",

    // Supabase functions (active ones)
    "supabase/functions/contact-links/**",
    "supabase/functions/vip-sync-enhanced/**",
    "supabase/functions/telegram-bot/**",
    "supabase/functions/_shared/**",

    // Essential configuration
    "supabase/config.toml",
    "supabase/migrations/**", // Recent migrations only
  ],

  remove: [
    // Duplicate or old components
    "components/admin/BotDebugger.tsx", // If functionality moved

    // Development-only files
    "scripts/audit/**",
    "scripts/cleanup/**",
    "scripts/verify/**",
    "docs/CLEANUP_AND_CODEMODS.md",

    // Duplicate Mini App if main app has same functionality
    "supabase/functions/miniapp/**", // If functionality is in main app

    // Old test files
    "tests/**", // If moved to proper test directories
    "functions/_tests/**", // If consolidated
  ],
};

export default handler;
