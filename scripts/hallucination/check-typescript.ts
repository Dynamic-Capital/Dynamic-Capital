import path from "node:path";
import process from "node:process";
import ts from "typescript";

export type HallucinationCategory =
  | "missing-module"
  | "missing-export"
  | "missing-types"
  | "undefined-symbol"
  | "undefined-namespace"
  | "missing-member";

export type HallucinationSeverity =
  | "error"
  | "warning"
  | "suggestion"
  | "message";

export interface TypeScriptHallucinationIssue {
  file: string;
  line: number;
  column: number;
  code: number;
  category: HallucinationCategory;
  severity: HallucinationSeverity;
  message: string;
  advice: string;
}

export interface TypeScriptScanOptions {
  project: string;
  files?: string[];
  verbose?: boolean;
}

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName(fileName) {
    return path.normalize(fileName);
  },
  getCurrentDirectory() {
    return process.cwd();
  },
  getNewLine() {
    return ts.sys.newLine;
  },
};

const CODE_CLASSIFICATIONS = new Map<
  number,
  { category: HallucinationCategory; advice: string }
>([
  [2307, {
    category: "missing-module",
    advice:
      "Ensure the module exists, the path is correct, and that it is included in tsconfig paths or dependencies.",
  }],
  [2305, {
    category: "missing-export",
    advice:
      "Confirm the symbol is exported from the referenced module or adjust the import statement.",
  }],
  [2304, {
    category: "undefined-symbol",
    advice: "Declare the symbol or import it from the module that defines it.",
  }],
  [2552, {
    category: "undefined-symbol",
    advice: "Fix the symbol name or add the missing declaration.",
  }],
  [2688, {
    category: "missing-types",
    advice:
      "Install or reference the appropriate type definition package (e.g. @types/...) and update tsconfig if needed.",
  }],
  [2503, {
    category: "undefined-namespace",
    advice: "Declare the namespace or import the module that provides it.",
  }],
  [2339, {
    category: "missing-member",
    advice:
      "Check that the target type exposes the referenced property or update the type definitions.",
  }],
  [2551, {
    category: "missing-member",
    advice:
      "Verify the property exists on the target type or guard against missing members.",
  }],
]);

const SEVERITY_MAP: Record<ts.DiagnosticCategory, HallucinationSeverity> = {
  [ts.DiagnosticCategory.Error]: "error",
  [ts.DiagnosticCategory.Warning]: "warning",
  [ts.DiagnosticCategory.Suggestion]: "suggestion",
  [ts.DiagnosticCategory.Message]: "message",
};

function resolveProjectPath(project: string): string {
  const candidate = path.resolve(process.cwd(), project);
  if (ts.sys.directoryExists(candidate)) {
    const configPath = path.join(candidate, "tsconfig.json");
    if (!ts.sys.fileExists(configPath)) {
      throw new Error(`Unable to locate tsconfig.json in ${candidate}`);
    }
    return configPath;
  }
  if (!ts.sys.fileExists(candidate)) {
    throw new Error(`Unable to locate project file: ${candidate}`);
  }
  return candidate;
}

function parseProjectConfiguration(configPath: string): ts.ParsedCommandLine {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext([configFile.error], formatHost),
    );
  }
  const parsed = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  );
  if (parsed.errors.length > 0) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(parsed.errors, formatHost),
    );
  }
  return parsed;
}

function classifyDiagnostic(
  diagnostic: ts.Diagnostic,
): { category: HallucinationCategory; advice: string } | null {
  const classification = CODE_CLASSIFICATIONS.get(diagnostic.code);
  if (classification) {
    return classification;
  }
  const message = ts
    .flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    .toLowerCase();
  if (message.includes("cannot find name")) {
    return {
      category: "undefined-symbol",
      advice:
        "Declare the symbol or import it from the correct module before use.",
    };
  }
  if (message.includes("has no exported member")) {
    return {
      category: "missing-export",
      advice:
        "Verify the export exists or adjust the import to match available exports.",
    };
  }
  return null;
}

function normalizeFileName(fileName: string): string {
  return path.relative(process.cwd(), path.resolve(fileName)) || fileName;
}

export async function scanTypeScriptForHallucinations(
  options: TypeScriptScanOptions,
): Promise<TypeScriptHallucinationIssue[]> {
  const projectPath = resolveProjectPath(options.project);
  if (options.verbose) {
    console.log(`Scanning TypeScript project: ${projectPath}`);
  }
  const parsedProject = parseProjectConfiguration(projectPath);
  const rootNames = options.files?.length
    ? options.files.map((filePath) => path.resolve(process.cwd(), filePath))
    : parsedProject.fileNames;
  if (options.verbose) {
    console.log(
      `Analysing ${rootNames.length} file(s) for hallucination signals.`,
    );
  }

  const program = ts.createProgram({
    rootNames,
    options: parsedProject.options,
    projectReferences: parsedProject.projectReferences,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);
  const issues: TypeScriptHallucinationIssue[] = [];
  for (const diagnostic of diagnostics) {
    const classification = classifyDiagnostic(diagnostic);
    if (!classification) {
      continue;
    }
    const severity = SEVERITY_MAP[diagnostic.category] ?? "error";
    let file = "<unknown>";
    let line = 0;
    let column = 0;
    if (diagnostic.file && typeof diagnostic.start === "number") {
      const position = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      file = normalizeFileName(diagnostic.file.fileName);
      line = position.line + 1;
      column = position.character + 1;
    }
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      ts.sys.newLine,
    );
    issues.push({
      file,
      line,
      column,
      code: diagnostic.code,
      category: classification.category,
      severity,
      message,
      advice: classification.advice,
    });
  }

  if (options.verbose) {
    console.log(`Detected ${issues.length} potential hallucination issue(s).`);
  }

  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.file}:${issue.line}:${issue.column}:${issue.code}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
