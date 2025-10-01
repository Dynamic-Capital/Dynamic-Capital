import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface Pillar {
  readonly title: string;
  readonly description: string;
}

interface TransparencyEntry {
  readonly name: string;
  readonly description: string;
}

interface DistributionRow {
  readonly allocation: string;
  readonly amount: number;
  readonly percent: number;
  readonly schedule: string;
}

interface SaleRound {
  readonly name: string;
  readonly allocation: number;
  readonly price: number;
  readonly priceDenom: string;
  readonly vesting: string;
  readonly notes?: string;
}

interface UtilityProgram {
  readonly title: string;
  readonly bullets: readonly string[];
}

interface EquationSection {
  readonly title: string;
  readonly formula: string;
  readonly explanation: string;
  readonly notes?: readonly string[];
}

interface RoadmapPhase {
  readonly phase: string;
  readonly focus: string;
  readonly deliverables: readonly string[];
}

interface GlossaryEntry {
  readonly term: string;
  readonly definition: string;
}

interface WhitepaperConfig {
  readonly slug: string;
  readonly outputPath: string;
  readonly title: string;
  readonly token: {
    readonly name: string;
    readonly symbol: string;
    readonly network: string;
    readonly supplyCap: number;
  };
  readonly abstract: readonly string[];
  readonly overview: {
    readonly opening: readonly string[];
    readonly pillars: readonly Pillar[];
    readonly closing?: readonly string[];
  };
  readonly tokenomics: {
    readonly intro: readonly string[];
    readonly policies: readonly string[];
  };
  readonly priceStrategy: {
    readonly launch: readonly string[];
    readonly secondary: readonly string[];
    readonly longTerm: readonly string[];
    readonly governance: readonly string[];
    readonly monitoring: readonly string[];
    readonly transparencyStack: readonly TransparencyEntry[];
  };
  readonly distributionTable: readonly DistributionRow[];
  readonly emissionNotes: readonly string[];
  readonly saleRounds: {
    readonly intro?: string;
    readonly rounds: readonly SaleRound[];
  };
  readonly utilityPrograms: readonly UtilityProgram[];
  readonly valuationFramework?: {
    readonly intro?: readonly string[];
    readonly equations: readonly EquationSection[];
    readonly closing?: readonly string[];
  };
  readonly treasury: readonly string[];
  readonly governance: {
    readonly councils: readonly string[];
    readonly quorum: string;
    readonly participation: readonly string[];
  };
  readonly reporting: {
    readonly cadence: readonly string[];
    readonly analytics: readonly string[];
  };
  readonly roadmap: readonly RoadmapPhase[];
  readonly compliance: readonly string[];
  readonly glossary: readonly GlossaryEntry[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const contentDir = path.join(repoRoot, "content", "whitepapers");

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function loadConfig(slug: string): Promise<WhitepaperConfig> {
  const filePath = path.join(contentDir, `${slug}.json`);
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as WhitepaperConfig;
  validateConfig(parsed, slug);
  return parsed;
}

function validateConfig(config: WhitepaperConfig, slug: string): void {
  const requiredStrings: Array<[unknown, string]> = [
    [config.slug, "slug"],
    [config.outputPath, "outputPath"],
    [config.title, "title"],
    [config.token?.name, "token.name"],
    [config.token?.symbol, "token.symbol"],
    [config.token?.network, "token.network"],
  ];

  for (const [value, key] of requiredStrings) {
    if (!value || typeof value !== "string") {
      throw new Error(`Invalid configuration for ${slug}: missing ${key}`);
    }
  }

  if (typeof config.token?.supplyCap !== "number") {
    throw new Error(
      `Invalid configuration for ${slug}: token.supplyCap must be a number`,
    );
  }
}

function renderParagraphs(lines: readonly string[]): string {
  return lines.filter(Boolean).map((line) => line.trim()).join("\n\n");
}

function renderBullets(lines: readonly string[], indent = 0): string {
  const prefix = " ".repeat(indent);
  return lines.map((line) => `${prefix}- ${line}`).join("\n");
}

function renderNumberedList(entries: readonly TransparencyEntry[]): string {
  return entries
    .map((entry, index) =>
      `${index + 1}. **${entry.name}** – ${entry.description}`
    )
    .join("\n");
}

function formatAmount(value: number): string {
  return numberFormatter.format(value);
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function formatPrice(value: number, denom: string): string {
  return `${decimalFormatter.format(value)} ${denom}`;
}

function renderTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const columnWidths = headers.map((header, columnIndex) => {
    const cellLengths = rows.map((row) => row[columnIndex]?.length ?? 0);
    return Math.max(header.length, ...cellLengths);
  });

  const renderRow = (cells: readonly string[]): string =>
    `| ${
      cells
        .map((cell, index) => cell.padEnd(columnWidths[index], " "))
        .join(" | ")
    } |`;

  const headerRow = renderRow(headers);
  const separatorRow = `| ${
    columnWidths
      .map((width) => "-".repeat(width))
      .join(" | ")
  } |`;
  const dataRows = rows.map((row) => renderRow(row));

  return [headerRow, separatorRow, ...dataRows].join("\n");
}

function renderDistributionTable(
  rows: readonly DistributionRow[],
  symbol: string,
): string {
  const tableRows = rows.map((row) => [
    row.allocation,
    formatAmount(row.amount),
    formatPercent(row.percent),
    row.schedule,
  ]);

  return renderTable([
    "Allocation",
    `Amount (${symbol})`,
    "Percent of Supply",
    "Vesting / Unlock Schedule",
  ], tableRows);
}

function renderSaleRounds(
  rounds: readonly SaleRound[],
  symbol: string,
): string {
  const rows = rounds.map((round) => [
    round.name,
    formatAmount(round.allocation),
    formatPrice(round.price, round.priceDenom),
    round.vesting,
    round.notes ?? "—",
  ]);

  return renderTable([
    "Round",
    `Allocation (${symbol})`,
    "Price",
    "Vesting / Unlock",
    "Notes",
  ], rows);
}

function renderUtilityPrograms(programs: readonly UtilityProgram[]): string {
  return programs
    .map((program) =>
      `### ${program.title}\n\n${renderBullets(program.bullets)}\n`
    )
    .join("\n");
}

function renderEquationSections(sections: readonly EquationSection[]): string {
  return sections
    .map((section) => {
      const parts = [
        `### ${section.title}`,
        "",
        "**Formula**",
        "",
        "```",
        section.formula,
        "```",
        "",
        section.explanation.trim(),
      ];

      if (section.notes?.length) {
        parts.push("", renderBullets(section.notes));
      }

      return parts.join("\n");
    })
    .join("\n\n");
}

function renderRoadmap(phases: readonly RoadmapPhase[]): string {
  return phases
    .map((phase) =>
      `### ${phase.phase}\n\n**Focus:** ${phase.focus}\n\n${
        renderBullets(phase.deliverables)
      }\n`
    )
    .join("\n");
}

function renderGlossary(entries: readonly GlossaryEntry[]): string {
  const rows = entries.map((entry) => [
    entry.term,
    entry.definition,
  ]);

  return renderTable(["Term", "Definition"], rows);
}

function buildDocument(config: WhitepaperConfig): string {
  const parts: string[] = [];
  parts.push(
    "<!-- This file is generated by scripts/whitepaper/generate.ts. Do not edit manually. -->\n",
  );
  parts.push(`# ${config.title}`);

  parts.push("## Abstract");
  parts.push(renderParagraphs(config.abstract));

  parts.push("## Protocol Overview");
  parts.push(renderParagraphs(config.overview.opening));
  parts.push(
    renderBullets(
      config.overview.pillars.map((pillar) =>
        `**${pillar.title}** – ${pillar.description}`
      ),
    ),
  );
  if (config.overview.closing?.length) {
    parts.push(renderParagraphs(config.overview.closing));
  }

  parts.push("## Total Supply and Tokenomics");
  parts.push(renderParagraphs(config.tokenomics.intro));
  parts.push(renderBullets(config.tokenomics.policies));

  parts.push("## Price Structure Strategy");
  parts.push("### Launch Pricing Mechanics");
  parts.push(renderBullets(config.priceStrategy.launch));
  parts.push("\n### Secondary-Market Support");
  parts.push(renderBullets(config.priceStrategy.secondary));
  parts.push("\n### Long-Term Stabilization Levers");
  parts.push(renderBullets(config.priceStrategy.longTerm));
  parts.push("\n### Governance Oversight");
  parts.push(renderBullets(config.priceStrategy.governance));
  parts.push("\n### Monitoring & Reporting");
  parts.push(renderBullets(config.priceStrategy.monitoring));

  parts.push("\n### TON DEX Transparency Stack");
  parts.push(renderNumberedList(config.priceStrategy.transparencyStack));

  parts.push("## Token Supply & Emissions");
  parts.push(
    renderDistributionTable(config.distributionTable, config.token.symbol),
  );
  parts.push("\n" + renderBullets(config.emissionNotes));

  if (config.valuationFramework) {
    parts.push("## Token Valuation Framework");
    if (config.valuationFramework.intro?.length) {
      parts.push(renderParagraphs(config.valuationFramework.intro));
    }
    parts.push(renderEquationSections(config.valuationFramework.equations));
    if (config.valuationFramework.closing?.length) {
      parts.push(renderParagraphs(config.valuationFramework.closing));
    }
  }

  parts.push("### Sale Rounds");
  if (config.saleRounds.intro) {
    parts.push(config.saleRounds.intro);
  }
  parts.push(renderSaleRounds(config.saleRounds.rounds, config.token.symbol));

  parts.push("## Utility Programs");
  parts.push(renderUtilityPrograms(config.utilityPrograms));

  parts.push("## Treasury Mechanics");
  parts.push(renderBullets(config.treasury));

  parts.push("## Governance Model");
  parts.push("### Councils & Roles");
  parts.push(renderBullets(config.governance.councils));
  parts.push("\n### Voting Requirements");
  parts.push(config.governance.quorum);
  parts.push("\n### Participation Lifecycle");
  parts.push(renderBullets(config.governance.participation));

  parts.push("## Reporting & Transparency");
  parts.push("### Cadence");
  parts.push(renderBullets(config.reporting.cadence));
  parts.push("\n### Analytics Distribution");
  parts.push(renderBullets(config.reporting.analytics));

  parts.push("## Roadmap");
  parts.push(renderRoadmap(config.roadmap));

  parts.push("## Compliance & Assurance");
  parts.push(renderBullets(config.compliance));

  parts.push("## Glossary");
  parts.push(renderGlossary(config.glossary));

  return parts.filter(Boolean).join("\n\n").trim() + "\n";
}

async function ensureDirectory(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  await mkdir(directory, { recursive: true });
}

async function generateWhitepaper(config: WhitepaperConfig): Promise<void> {
  const absoluteOutputPath = path.join(repoRoot, config.outputPath);
  const document = buildDocument(config);
  await ensureDirectory(absoluteOutputPath);
  await writeFile(absoluteOutputPath, document, "utf-8");
  console.log(`✅ Generated ${config.outputPath}`);
}

async function resolveSlugsFromArgs(): Promise<string[]> {
  const args = process.argv.slice(2);
  if (args.includes("--all")) {
    const files = await readdir(contentDir);
    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, ""))
      .sort();
  }

  if (args.length === 0) {
    return resolveSlugsFromArgsInner(await readdir(contentDir));
  }

  return args;
}

function resolveSlugsFromArgsInner(files: readonly string[]): string[] {
  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

async function main(): Promise<void> {
  const slugs = await resolveSlugsFromArgs();
  if (slugs.length === 0) {
    console.log("No whitepaper configurations found.");
    return;
  }

  for (const slug of slugs) {
    const config = await loadConfig(slug);
    await generateWhitepaper(config);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
