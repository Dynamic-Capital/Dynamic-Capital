#!/usr/bin/env -S deno run -A
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

type CategoryId =
  | "applications"
  | "data"
  | "infrastructure"
  | "tooling"
  | "quality"
  | "documentation"
  | "configuration"
  | "generated"
  | "misc";

interface Category {
  id: CategoryId;
  title: string;
  description: string;
}

interface OrganizedEntry {
  name: string;
  displayName: string;
  type: "Directory" | "File" | "Other";
  description: string;
}

interface CategoryBucket extends Category {
  items: OrganizedEntry[];
}

interface EntryMeta {
  category: CategoryId;
  description: string;
}

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "..");
const projectName = relative(dirname(repoRoot), repoRoot) ||
  repoRoot.split("/").pop() ||
  "repository";

function formatDate(date: Date): string {
  return date.toUTCString();
}

const categories: CategoryBucket[] = [
  {
    id: "applications",
    title: "Applications & Runtime Surfaces",
    description:
      "Entry points that serve the marketing site, admin console, automation workers, and exported landing snapshot.",
    items: [],
  },
  {
    id: "data",
    title: "Data Layer & Platform Services",
    description:
      "Supabase assets, database clients, and supporting automation that power persistence and RPC flows.",
    items: [],
  },
  {
    id: "infrastructure",
    title: "Infrastructure & Deployment",
    description:
      "Deployment manifests, container assets, DNS automation, and platform-specific helpers.",
    items: [],
  },
  {
    id: "tooling",
    title: "Tooling & Developer Experience",
    description:
      "Scripts and utilities that streamline builds, local workflows, and developer ergonomics.",
    items: [],
  },
  {
    id: "quality",
    title: "Quality & Testing",
    description:
      "Automated test suites and helper scaffolding that protect critical flows.",
    items: [],
  },
  {
    id: "documentation",
    title: "Documentation & Knowledge Base",
    description:
      "Reference material, runbooks, and contributor onboarding resources.",
    items: [],
  },
  {
    id: "configuration",
    title: "Configuration & Project Settings",
    description:
      "Workspace manifests, environment samples, and build system configuration files.",
    items: [],
  },
  {
    id: "generated",
    title: "Generated Artifacts",
    description:
      "Dependency caches or build outputs that live in the repository tree but are produced by tooling.",
    items: [],
  },
  {
    id: "misc",
    title: "Unclassified Items",
    description:
      "Entries that still need manual categorisation. Update `scripts/repo-file-organizer.ts` when these appear.",
    items: [],
  },
];

const categoriesById = new Map<CategoryId, CategoryBucket>(
  categories.map((category) => [category.id, category] as const),
);

const entryMeta: Record<string, EntryMeta> = {
  "_static": {
    category: "applications",
    description:
      "Pre-rendered landing snapshot served by `server.js` for CDN delivery.",
  },
  "algorithms": {
    category: "applications",
    description:
      "Trading automation workspace spanning Pine Script strategies, webhook ingestion, and MT5 bridge tooling.",
  },
  "apps": {
    category: "applications",
    description:
      "Next.js monorepo powering the marketing landing page and Telegram operations console.",
  },
  "broadcast": {
    category: "applications",
    description:
      "Standalone broadcast planner used for scheduled outbound Telegram messages.",
  },
  "go-service": {
    category: "applications",
    description:
      "Minimal Go HTTP service exposing `/healthz` for uptime monitoring.",
  },
  "queue": {
    category: "applications",
    description:
      "Background worker harness that processes queued jobs outside the webhook request lifecycle.",
  },
  "server.js": {
    category: "applications",
    description:
      "Hardened Node server that serves the `_static` snapshot with security headers and health checks.",
  },
  "src": {
    category: "applications",
    description:
      "Lovable/Vite development harness and stubs that proxy into the Next.js app during local development.",
  },
  "supabase": {
    category: "data",
    description:
      "Supabase migrations, edge functions, and configuration powering Telegram bot flows and analytics.",
  },
  "db": {
    category: "data",
    description:
      "TypeScript client helpers and schema utilities for Supabase/Postgres access outside edge functions.",
  },
  "docker": {
    category: "infrastructure",
    description:
      "Dockerfiles, Compose definitions, and Nginx configuration for running the stack in containers.",
  },
  "dns": {
    category: "infrastructure",
    description:
      "DigitalOcean DNS exports and automation descriptors used for reproducing external records.",
  },
  ".do": {
    category: "infrastructure",
    description: "DigitalOcean app specification and deployment metadata.",
  },
  "Procfile": {
    category: "infrastructure",
    description:
      "Process definition for platform-as-a-service deployments of the Node server.",
  },
  "vercel.json": {
    category: "infrastructure",
    description:
      "Vercel project configuration toggling headers and rewrites for the Next.js app.",
  },
  "lovable-build.js": {
    category: "tooling",
    description:
      "Lovable automation helper that orchestrates production builds across app surfaces.",
  },
  "lovable-dev.js": {
    category: "tooling",
    description: "Lovable development bootstrapper for local preview flows.",
  },
  "scripts": {
    category: "tooling",
    description:
      "Operational scripts for builds, environment sync, Telegram automation, and verification tasks.",
  },
  "tools": {
    category: "tooling",
    description:
      "Developer utilities such as the AlgoKit-inspired scaffolding CLI.",
  },
  ".github": {
    category: "tooling",
    description: "GitHub Actions workflows and repository configuration.",
  },
  "tests": {
    category: "quality",
    description:
      "Deno-based test suites and stubs covering API endpoints, Telegram flows, and payment logic.",
  },
  "functions": {
    category: "quality",
    description: "Legacy Deno test harnesses for Supabase edge functions.",
  },
  "docs": {
    category: "documentation",
    description:
      "Knowledge base containing runbooks, checklists, and compliance artefacts.",
  },
  "README.md": {
    category: "documentation",
    description:
      "Project overview, setup instructions, and architecture summary.",
  },
  "SECURITY.md": {
    category: "documentation",
    description: "Security policy and responsible disclosure process.",
  },
  "LICENSE": {
    category: "documentation",
    description: "Licensing terms governing repository usage.",
  },
  "package.json": {
    category: "configuration",
    description: "npm workspace manifest defining scripts and dependencies.",
  },
  "package-lock.json": {
    category: "configuration",
    description:
      "Lockfile for npm dependencies to ensure reproducible installs.",
  },
  "deno.json": {
    category: "configuration",
    description: "Deno configuration and task runner definitions.",
  },
  "deno.lock": {
    category: "configuration",
    description: "Deno module lockfile capturing remote dependencies.",
  },
  "go.work": {
    category: "configuration",
    description:
      "Go workspace file linking Go-based services and shared modules.",
  },
  "project.toml": {
    category: "configuration",
    description: "Lovable project manifest describing workspace metadata.",
  },
  "tsconfig.json": {
    category: "configuration",
    description:
      "TypeScript compiler configuration shared across the monorepo.",
  },
  "tailwind.config.ts": {
    category: "configuration",
    description: "Tailwind CSS configuration for the Next.js surfaces.",
  },
  "postcss.config.js": {
    category: "configuration",
    description: "PostCSS pipeline configuration.",
  },
  "vite.config.ts": {
    category: "configuration",
    description:
      "Vite proxy configuration used during Lovable-driven development.",
  },
  ".env.example": {
    category: "configuration",
    description:
      "Sample environment variables for local development and onboarding.",
  },
  ".editorconfig": {
    category: "configuration",
    description:
      "Editor configuration enforcing shared formatting conventions.",
  },
  ".gitignore": {
    category: "configuration",
    description: "Git ignore rules for generated or local-only files.",
  },
  ".dockerignore": {
    category: "configuration",
    description: "Docker build context exclusions aligned with `.gitignore`.",
  },
  ".denoignore": {
    category: "configuration",
    description: "Deno task exclusions for generated or irrelevant paths.",
  },
  ".nvmrc": {
    category: "configuration",
    description: "Node.js version pin for contributors using `nvm`.",
  },
  "index.html": {
    category: "applications",
    description:
      "Static shell used by the Lovable/Vite harness to proxy into the Next.js application.",
  },
  "node_modules": {
    category: "generated",
    description:
      "Installed npm dependencies (excluded from version control in practice).",
  },
};

const includeHidden = new Set([
  ".github",
  ".do",
  ".env.example",
  ".editorconfig",
  ".gitignore",
  ".dockerignore",
  ".denoignore",
  ".nvmrc",
]);

const skipEntries = new Set([".git"]);

async function collectTopLevelEntries(): Promise<OrganizedEntry[]> {
  const entries: OrganizedEntry[] = [];
  for await (const entry of Deno.readDir(repoRoot)) {
    const isHidden = entry.name.startsWith(".");
    if (isHidden && !includeHidden.has(entry.name)) continue;
    if (skipEntries.has(entry.name)) continue;

    const meta = entryMeta[entry.name];
    const type: OrganizedEntry["type"] = entry.isDirectory
      ? "Directory"
      : entry.isFile
      ? "File"
      : "Other";
    const displayName = entry.isDirectory ? `${entry.name}/` : entry.name;

    entries.push({
      name: entry.name,
      displayName,
      type,
      description: meta?.description ?? "Needs categorisation.",
    });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

const entries = await collectTopLevelEntries();

for (const entry of entries) {
  const categoryId = entryMeta[entry.name]?.category ?? "misc";
  const bucket = categoriesById.get(categoryId) ?? categoriesById.get("misc")!;
  bucket.items.push(entry);
}

const lines: string[] = [];
lines.push(`# Repository File Organizer — ${projectName}`);
lines.push("");
lines.push(`**Generated:** ${formatDate(new Date())}`);
lines.push(`**Repo root:** ${projectName}`);
lines.push("");
lines.push(
  "This organizer groups top-level files and directories into logical domains so contributors can quickly locate the right surface when shipping changes.",
);
lines.push("");
lines.push(
  "Run `npm run docs:organize` whenever the repository layout changes to refresh this document.",
);
lines.push("");

for (const category of categories) {
  lines.push(`## ${category.title}`);
  lines.push("");
  lines.push(`_${category.description}_`);
  lines.push("");

  if (category.items.length === 0) {
    lines.push("- _No entries tracked in this category yet._");
    lines.push("");
    continue;
  }

  lines.push("| Path | Type | Summary |");
  lines.push("| --- | --- | --- |");
  for (const item of category.items) {
    lines.push(
      `| \`${item.displayName}\` | ${item.type} | ${item.description} |`,
    );
  }
  lines.push("");
}

const target = join(repoRoot, "docs", "REPO_FILE_ORGANIZER.md");
await Deno.writeTextFile(target, lines.join("\n"));

console.log(`Updated ${target}`);
