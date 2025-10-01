#!/usr/bin/env -S deno run -A
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(currentDir, "..", "..");
const outputPath = join(repoRoot, "docs", "project-scan.md");

type Step = {
  title: string;
  description: string[];
  pathsToVerify?: string[];
};

type Highlight =
  | {
    directory: string;
    description: string;
    path: string;
    children?: undefined;
  }
  | {
    directory: string;
    description?: string;
    path: string;
    children: { name: string; description: string; path: string }[];
  };

const steps: Step[] = [
  {
    title: "Inventory top-level domains",
    description: [
      "Enumerated primary directories at the repository root to understand the breadth of applications, backend services,",
      "and automation utilities before diving deeper.",
    ],
    pathsToVerify: ["."],
  },
  {
    title: "Inspect client experiences",
    description: [
      "Opened the `apps/` workspace to verify that `landing` and `web` house the marketing site and the Next.js-powered Telegram",
      "Mini App/dashboard bundle respectively.",
    ],
    pathsToVerify: ["apps", "apps/landing", "apps/web"],
  },
  {
    title: "Review algorithmic engines",
    description: [
      "Surveyed Python packages under `algorithms/`, `core/`, `dynamic/intelligence/ai_apps/`, `dynamic/trading/algo/`, and",
      "`dynamic/platform/token/` to map where trading, treasury, and AI orchestration logic live.",
    ],
    pathsToVerify: [
      "algorithms",
      "core",
      "dynamic/intelligence/ai_apps",
      "dynamic/trading/algo",
      "dynamic/platform/token",
    ],
  },
  {
    title: "Trace integrations and queues",
    description: [
      "Checked `integrations/` and `queue/` to identify connectors for MT5, Telegram, TradingView, and the lightweight job",
      "runner dispatching asynchronous workloads.",
    ],
    pathsToVerify: ["integrations", "queue"],
  },
  {
    title: "Map infrastructure tooling",
    description: [
      "Explored `scripts/`, `supabase/`, and `tools/` to catalogue deployment flows, edge functions, and resource",
      "definitions supporting automation and infrastructure-as-code.",
    ],
    pathsToVerify: ["scripts", "supabase", "tools"],
  },
];

const highlights: Highlight[] = [
  {
    directory: "apps/",
    path: "apps",
    children: [
      {
        name: "landing",
        path: "apps/landing",
        description:
          "Lightweight marketing site package for the public-facing experience.",
      },
      {
        name: "web",
        path: "apps/web",
        description:
          "Comprehensive Next.js App Router workspace powering the Telegram Mini App and admin console with shared components, hooks, and services.",
      },
    ],
  },
  {
    directory: "algorithms/",
    path: "algorithms",
    description:
      "Contains algorithm artifacts across Python, Pine Script, MQL5, and webhook adapters for strategy experimentation and external integrations.",
  },
  {
    directory: "core/",
    path: "core",
    description:
      "Python trading core with fusion engines, market-making routines, and shared Supabase client utilities.",
  },
  {
    directory: "dynamic/intelligence/ai_apps/",
    path: "dynamic/intelligence/ai_apps",
    description:
      "AI orchestration layer coordinating agent behaviors, risk modules, hedging, and training pipelines.",
  },
  {
    directory: "dynamic/trading/algo/",
    path: "dynamic/trading/algo",
    description:
      "Modular automation suite describing roles (CEO/CFO/COO), marketing, analytics, and middleware primitives for Dynamic Capital workflows.",
  },
  {
    directory: "dynamic/platform/token/",
    path: "dynamic/platform/token",
    description:
      "Treasury utilities managing Dynamic Capital Token accounting logic.",
  },
  {
    directory: "integrations/",
    path: "integrations",
    description:
      "Connectors bridging MT5, Telegram bots, TradingView feeds, and Supabase logging helpers.",
  },
  {
    directory: "queue/",
    path: "queue",
    description:
      "Custom TypeScript job queue with processors such as `dct-events` to deliver webhook payloads reliably.",
  },
  {
    directory: "scripts/",
    path: "scripts",
    description:
      "Extensive deployment, auditing, and operational scripts for Supabase, Telegram webhooks, Mini App builds, and environment validation.",
  },
  {
    directory: "supabase/",
    path: "supabase",
    description:
      "Edge functions, migrations, and resource schematics driving the Supabase backend, including automation cron jobs and webhook handlers.",
  },
  {
    directory: "docs/",
    path: "docs",
    description:
      "Knowledge base covering architecture overviews, compliance, whitepapers, and contributor guides.",
  },
  {
    directory: "data/",
    path: "data",
    description:
      "Datasets and machine learning artifact placeholders that support analytics and AI-driven features across the platform.",
  },
  {
    directory: "dynamic/models/",
    path: "models",
    description:
      "Model checkpoints and assets referenced by AI-assisted tooling and analytics flows.",
  },
  {
    directory: "tools/",
    path: "tools",
    description:
      "Developer utilities, including automation helpers and shared workflows for repository maintenance.",
  },
];

async function ensureDirectoryExists(relativePath: string) {
  const target = join(repoRoot, relativePath);
  try {
    const info = await Deno.stat(target);
    if (!info.isDirectory) {
      throw new Error(`${relativePath} exists but is not a directory`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Expected directory not found: ${relativePath}`);
    }
    throw error;
  }
}

const directoriesToVerify = new Set<string>();
for (const step of steps) {
  for (const path of step.pathsToVerify ?? []) {
    directoriesToVerify.add(path);
  }
}
for (const highlight of highlights) {
  directoriesToVerify.add(highlight.path);
  if (highlight.children) {
    for (const child of highlight.children) {
      directoriesToVerify.add(child.path);
    }
  }
}

await Promise.all(
  Array.from(directoriesToVerify).map((directory) =>
    ensureDirectoryExists(directory)
  ),
);

const lines: string[] = [];
lines.push("<!-- Generated by scripts/project/generate-project-scan.ts -->");
lines.push("# Project Scan Overview");
lines.push("");
lines.push("## Step-by-step reconnaissance");
lines.push("");

steps.forEach((step, index) => {
  const prefix = `${index + 1}.`;
  const [first, ...rest] = step.description;
  lines.push(`${prefix} **${step.title}** – ${first}`);
  for (const segment of rest) {
    lines.push(`   ${segment}`);
  }
});

lines.push("");
lines.push("## Directory highlights");
lines.push("");

for (const highlight of highlights) {
  if (highlight.children) {
    lines.push(`- \`${highlight.directory}\``);
    for (const child of highlight.children) {
      lines.push(
        `  - \`${child.name}\`: ${child.description}`,
      );
    }
  } else {
    lines.push(`- \`${highlight.directory}\`: ${highlight.description}`);
  }
}

lines.push("");

await Deno.writeTextFile(outputPath, `${lines.join("\n")}\n`);

console.log(
  `Project scan overview generated at ${
    outputPath.replace(`${repoRoot}/`, "")
  }`,
);
