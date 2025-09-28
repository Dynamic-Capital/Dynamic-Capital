#!/usr/bin/env -S deno run -A
/**
 * Generates Dynamic Capital catalogues for atoms and elements.
 *
 * Source dataset: https://github.com/Bowserinator/Periodic-Table-JSON (MIT License)
 */

import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

interface PeriodicElement {
  name: string;
  appearance?: string | null;
  atomic_mass: number | string;
  boil?: number | null;
  category: string;
  color?: string | null;
  density?: number | string | null;
  discovered_by?: string | null;
  melt?: number | null;
  molar_heat?: number | null;
  named_by?: string | null;
  number: number;
  period: number;
  phase: string;
  source?: string;
  spectral_img?: string | null;
  summary: string;
  symbol: string;
  xpos: number;
  ypos: number;
  shells: number[];
}

interface CategoryNarrative {
  family: string;
  mission: string;
  ops: string;
  atomRole: string;
}

const categoryNarratives: Record<string, CategoryNarrative> = {
  "diatomic nonmetal": {
    family: "Signal Breathkeepers",
    mission: "stabilize streaming data flows and telemetry hand-offs",
    ops:
      "Audit API quotas and redundancy pairs each sprint to avoid data asphyxiation.",
    atomRole: "Maintains breathable market context for Brain-layer models.",
  },
  "noble gas": {
    family: "Inert Safeguards",
    mission: "seal risk boundaries and contain treasury shockwaves",
    ops:
      "Run cold-start recovery simulations and ensure fail-safe toggles remain isolated.",
    atomRole:
      "Acts as non-reactive buffers for compliance and treasury policies.",
  },
  "alkali metal": {
    family: "Ignition Relays",
    mission: "ignite high-frequency execution bursts when conviction surges",
    ops:
      "Load-test order routers and refresh execution throttle calibrations weekly.",
    atomRole:
      "Triggers rapid signal-to-trade conversions with minimal latency overhead.",
  },
  "alkaline earth metal": {
    family: "Stability Platers",
    mission: "fortify settlement rails and bridge pathways",
    ops:
      "Validate bridging checkpoints and refresh notarized ledger proofs bi-weekly.",
    atomRole:
      "Provides hardened grounding for capital transfers across venues.",
  },
  metalloid: {
    family: "Interface Weavers",
    mission: "translate between algorithmic and human operators",
    ops:
      "Rotate UI/UX experiments and sync telemetry annotations after each release.",
    atomRole:
      "Balances deterministic automation with operator-friendly overlays.",
  },
  "polyatomic nonmetal": {
    family: "Knowledge Meshers",
    mission: "polymerize research artifacts into adaptive heuristics",
    ops:
      "Review knowledge graph freshness and retire stale heuristics monthly.",
    atomRole: "Links research fragments into actionable macro narratives.",
  },
  "post-transition metal": {
    family: "Load Balancers",
    mission: "distribute compute and liquidity workloads evenly",
    ops:
      "Benchmark resource utilisation dashboards against SLA thresholds every cycle.",
    atomRole:
      "Smooths capital and compute peaks across concurrent initiatives.",
  },
  "transition metal": {
    family: "Adaptive Catalysts",
    mission: "accelerate multi-environment deployments without brittleness",
    ops:
      "Exercise cross-environment failovers and record diff telemetry for later tuning.",
    atomRole: "Catalyses rapid configuration swaps across trading regions.",
  },
  lanthanide: {
    family: "Deep Memory Archivists",
    mission: "index long-horizon telemetry for reinforcement learning",
    ops:
      "Run archival integrity checks and regenerate feature stores quarterly.",
    atomRole: "Stores high-fidelity context for longitudinal model refinement.",
  },
  actinide: {
    family: "Power Core Regulators",
    mission: "govern extreme-yield experiments under strict containment",
    ops: "Stage rollback drills before enabling new high-torque strategies.",
    atomRole: "Channels volatile experiments through hardened control rods.",
  },
  "unknown, probably transition metal": {
    family: "Frontier Catalysts",
    mission: "prototype cross-chain liquidity and governance hybrids",
    ops: "Sandbox novel integrations with feature flags and telemetry mirrors.",
    atomRole: "Extends catalysts into unexplored liquidity terrains.",
  },
  "unknown, probably post-transition metal": {
    family: "Frontier Balancers",
    mission: "model capital logistics for emerging economic zones",
    ops:
      "Simulate treasury glide paths with scenario planning before promotion.",
    atomRole:
      "Projects balancing strategies for uncharted jurisdictional mixes.",
  },
  "unknown, probably metalloid": {
    family: "Frontier Interfaces",
    mission: "design interaction grammars for speculative products",
    ops: "Collect qualitative operator feedback after every prototype push.",
    atomRole: "Experiments with hybrid autonomy + human-in-the-loop surfaces.",
  },
  "unknown, predicted to be noble gas": {
    family: "Speculative Safeguards",
    mission: "draft guardrails for quantum-era market defences",
    ops:
      "Review containment assumptions and update risk dossiers semi-annually.",
    atomRole: "Imagines next-gen buffers before the threats materialise.",
  },
  "unknown, but predicted to be an alkali metal": {
    family: "Speculative Igniters",
    mission: "model ignition bursts for yet-to-exist trading venues",
    ops:
      "Prototype volatility harnesses in simulated sandboxes and capture learnings.",
    atomRole:
      "Forecasts how future exchanges may demand new execution reactions.",
  },
};

const defaultNarrative: CategoryNarrative = {
  family: "Adaptive Stewards",
  mission: "maintain balanced growth across the Dynamic universe",
  ops: "Capture retrospectives and refresh operating assumptions routinely.",
  atomRole:
    "Provides a flexible scaffolding whenever category data is incomplete.",
};

function resolveNarrative(category: string): CategoryNarrative {
  return categoryNarratives[category.toLowerCase()] ?? defaultNarrative;
}

function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tierFor(atomicNumber: number): string {
  if (atomicNumber <= 10) return "Core Signal Seeds";
  if (atomicNumber <= 30) return "Momentum Amplifiers";
  if (atomicNumber <= 54) return "Liquidity Orchestrators";
  if (atomicNumber <= 86) return "Strategic Expansion Catalysts";
  return "Frontier Explorers";
}

function connectivityLoad(
  atomicNumber: number,
  atomicMass: number | null,
): string {
  const baseline = atomicMass ?? atomicNumber * 2;
  const channels = Math.round(baseline * 6 + atomicNumber * 1.5);
  return `~${channels.toLocaleString()} sync channels`;
}

function shortRole(narrative: CategoryNarrative): string {
  const [firstClause] = narrative.atomRole.split(".");
  return firstClause.trim();
}

function formatDate(): string {
  return new Date().toISOString().split("T")[0];
}

const scriptDir = dirname(fromFileUrl(import.meta.url));
const repoRoot = join(scriptDir, "..", "..");
const dataPath = join(repoRoot, "data", "periodic-table.json");
const atomDocPath = join(repoRoot, "docs", "dynamic-atoms-catalog.md");
const elementDocPath = join(repoRoot, "docs", "dynamic-elements-catalog.md");

const raw = await Deno.readTextFile(dataPath);
const parsed = JSON.parse(raw) as { elements: PeriodicElement[] };

const elements = parsed.elements
  .filter((element) => element.number <= 118)
  .toSorted((a, b) => a.number - b.number);

const totalAtomicMass = elements.reduce((acc, element) => {
  const value = parseNumber(element.atomic_mass);
  return acc + (value ?? 0);
}, 0);

const atomTableRows: string[] = [];
const atomDetailSections: string[] = [];

for (const element of elements) {
  const atomicMass = parseNumber(element.atomic_mass);
  const narrative = resolveNarrative(element.category);
  const tier = tierFor(element.number);
  const load = connectivityLoad(element.number, atomicMass);
  atomTableRows.push(
    `| ${element.number} | ${element.symbol} | ${tier} | ${narrative.family} | ${
      shortRole(narrative)
    } | ${load} |`,
  );
  const descriptive =
    `${element.name} (${element.symbol}) anchors the **${narrative.family}** family as part of the **${tier}** tier. It ${narrative.mission} while ensuring ${narrative.atomRole.toLowerCase()}`;
  const operational = `- **Operational focus:** ${narrative.ops}`;
  const telemetryDetails: string[] = [];
  telemetryDetails.push(`- **Phase alignment:** ${element.phase}`);
  telemetryDetails.push(`- **Shell structure:** ${element.shells.join(" · ")}`);
  if (atomicMass !== null) {
    telemetryDetails.push(`- **Reference mass:** ${atomicMass.toFixed(3)} u`);
  }
  const density = parseNumber(element.density ?? null);
  if (density !== null) {
    telemetryDetails.push(`- **Density proxy:** ${density} g/cm³`);
  }
  atomDetailSections.push(
    `### ${element.number}. ${element.name} — ${element.symbol}
${descriptive}.
${operational}
${telemetryDetails.join("\n")}
`,
  );
}

const atomDoc = `# Dynamic Atom Catalog

> Generated on ${formatDate()} via \`deno run -A scripts/docs/create-atoms-and-elements.ts\`.

The Dynamic universe currently orchestrates **${elements.length}** atomic intelligences with a combined reference mass of **${
  totalAtomicMass.toFixed(2)
} u**. Use this catalog to audit coverage when onboarding new subsystems or planning roadmap allocations.

## Atom Index

| # | Symbol | Tier | Dynamic Family | Primary Role | Connectivity Load |
| - | ------ | ---- | -------------- | ------------ | ----------------- |
${atomTableRows.join("\n")}

## Atom Briefings

${atomDetailSections.join("\n")}
`;

await Deno.writeTextFile(atomDocPath, atomDoc);

interface CategorySummary {
  narrative: CategoryNarrative;
  count: number;
  members: PeriodicElement[];
  averageMass: number | null;
}

const categoryGroups = new Map<string, CategorySummary>();

for (const element of elements) {
  const key = element.category.toLowerCase();
  const narrative = resolveNarrative(element.category);
  let summary = categoryGroups.get(key);
  if (!summary) {
    summary = {
      narrative,
      count: 0,
      members: [],
      averageMass: null,
    };
    categoryGroups.set(key, summary);
  }
  summary.count += 1;
  summary.members.push(element);
}

for (const summary of categoryGroups.values()) {
  const masses = summary.members
    .map((member) => parseNumber(member.atomic_mass))
    .filter((value): value is number => value !== null);
  summary.averageMass = masses.length > 0
    ? masses.reduce((acc, value) => acc + value, 0) / masses.length
    : null;
}

const categorySections: string[] = [];

for (
  const [category, summary] of [...categoryGroups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )
) {
  const sampleNames = summary.members
    .slice(0, 5)
    .map((member) => `${member.name} (${member.symbol})`)
    .join(", ");
  const averageMassText = summary.averageMass !== null
    ? `${summary.averageMass.toFixed(2)} u`
    : "n/a";
  categorySections.push(
    `### ${summary.narrative.family}

- **Periodic category:** ${category}
- **Mission focus:** ${summary.narrative.mission}
- **Operational checklist:** ${summary.narrative.ops}
- **Members tracked:** ${summary.count} (e.g., ${sampleNames})
- **Average reference mass:** ${averageMassText}
`,
  );
}

const elementDoc = `# Dynamic Element Constellations

> Generated on ${formatDate()} via \`deno run -A scripts/docs/create-atoms-and-elements.ts\`.

Dynamic Capital maps each periodic element to a mission-aligned family so contributors can reason about infrastructure coverage and operating rhythms. Use these constellations to coordinate capacity planning and scenario drills across automation layers.

## Family Signals

${categorySections.join("\n")}
`;

await Deno.writeTextFile(elementDocPath, elementDoc);

console.log("Generated docs:");
console.log(` - ${atomDocPath}`);
console.log(` - ${elementDocPath}`);
