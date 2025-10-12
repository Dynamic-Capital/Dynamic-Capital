import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const strictMode = args.has("--strict");

// Directories that should be skipped entirely when scanning for hardcoded values.
const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  ".next",
  "out",
  "tmp",
  "env",
  "__pycache__",
  ".expo",
  "third_party",
  "tonutils-reverse-proxy-linux-amd64",
]);

const MAX_FILE_SIZE_BYTES = 512 * 1024; // 512 KiB

const IGNORED_FILE_NAMES = new Set([
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "poetry.lock",
  "Cargo.lock",
  "Pipfile.lock",
  "composer.lock",
]);

// Files with these extensions are treated as text and scanned for suspicious tokens.
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".py",
  ".md",
  ".mdx",
  ".yaml",
  ".yml",
  ".toml",
  ".env",
  ".ini",
  ".cfg",
  ".conf",
  ".txt",
  ".sh",
  ".bash",
  ".ps1",
  ".sql",
  ".csv",
  ".tsv",
  ".html",
  ".css",
]);

type Pattern = {
  name: string;
  description: string;
  regex: RegExp;
};

const SECRET_PATTERNS: Pattern[] = [
  {
    name: "OpenAI API key",
    description:
      "Matches strings beginning with sk- followed by 20+ mixed characters.",
    regex: /sk-[a-zA-Z0-9]{20,}/g,
  },
  {
    name: "Google API key",
    description: "Matches strings beginning with AIza and 35 characters.",
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
  },
  {
    name: "GitHub token",
    description:
      "Matches GitHub personal access tokens or fine-grained tokens.",
    regex: /(ghp|github_pat)_[0-9A-Za-z_]{35,}/g,
  },
  {
    name: "Slack token",
    description: "Matches Slack legacy and bot tokens.",
    regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g,
  },
  {
    name: "AWS access key",
    description: "Matches AWS style access keys.",
    regex: /(AKIA|ASIA|A3T[A-Z0-9])[0-9A-Z]{12,}/g,
  },
  {
    name: "Stripe secret",
    description: "Matches Stripe live and test keys.",
    regex: /(sk|rk|pk)_(live|test)_[0-9a-zA-Z]{24,}/g,
  },
  {
    name: "SendGrid key",
    description: "Matches SendGrid API keys.",
    regex: /SG\.[0-9A-Za-z\-_]{22}\.[0-9A-Za-z\-_]{43}/g,
  },
  {
    name: "Twilio key",
    description: "Matches Twilio style API keys.",
    regex: /SK[0-9a-fA-F]{32}/g,
  },
];

type Detection = {
  pattern: Pattern | "generic";
  file: string;
  line: number;
  column: number;
  value: string;
};

type AllowRule = {
  filePattern: RegExp;
  valuePattern?: RegExp;
  reason?: string;
};

const TON_ADDRESS_PATTERN = /^[EU][0-9A-Za-z_-]{45,}={0,2}$/;
const TON_BASE64_PATTERN = /^[0-9A-Za-z+/=_-]{40,}$/;

const ALLOW_LIST: AllowRule[] = [
  {
    filePattern: /^(dns|_static\/ton|shared\/ton)\//,
    valuePattern: TON_ADDRESS_PATTERN,
    reason: "Published TON wallet address",
  },
  {
    filePattern: /^(dns|_static\/ton|dynamic-capital-ton|shared\/ton)\//,
    valuePattern: TON_BASE64_PATTERN,
    reason: "Published TON base64 resource",
  },
  {
    filePattern: /^supabase\/functions\/miniapp\/static\/assets\//,
    valuePattern: TON_ADDRESS_PATTERN,
    reason: "Bundled TON address in static asset",
  },
  {
    filePattern: /^supabase\/functions\/miniapp\/static\/assets\//,
    valuePattern: TON_BASE64_PATTERN,
    reason: "Bundled TON base64 resource",
  },
  {
    filePattern: /^apps\/web\/services\/__tests__\/dct-price\.test\.ts$/,
    valuePattern: TON_ADDRESS_PATTERN,
    reason: "Test fixture referencing TON address",
  },
  {
    filePattern: /^docs\/.*ton.*\.md$/i,
    valuePattern: TON_ADDRESS_PATTERN,
  },
  {
    filePattern: /^docs\/.*ton.*\.md$/i,
    valuePattern: TON_BASE64_PATTERN,
  },
];

function isAllowed(file: string, value: string) {
  if (strictMode) {
    return false;
  }
  return ALLOW_LIST.some((rule) => {
    if (!rule.filePattern.test(file)) {
      return false;
    }
    if (rule.valuePattern && !rule.valuePattern.test(value)) {
      return false;
    }
    return true;
  });
}

async function walk(directory: string, files: string[]) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      continue;
    }
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue;
      await walk(entryPath, files);
    } else if (entry.isFile()) {
      if (shouldScanFile(entryPath)) {
        try {
          const stats = await fs.stat(entryPath);
          if (stats.size > MAX_FILE_SIZE_BYTES) continue;
        } catch (error) {
          console.warn(`Skipping ${entryPath} due to stat error:`, error);
          continue;
        }
        files.push(entryPath);
      }
    }
  }
}

function shouldScanFile(filePath: string) {
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath);

  if (IGNORED_FILE_NAMES.has(baseName)) {
    return false;
  }

  if (baseName.endsWith(".lock")) {
    return false;
  }

  if (ext && TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  if (!ext) {
    // Allow scanning dotfiles like .env.local or scripts without extensions.
    if (baseName.startsWith(".")) return true;
    return /^[A-Za-z0-9_-]+$/.test(baseName);
  }
  return false;
}

function computePosition(content: string, index: number) {
  const before = content.slice(0, index);
  const lines = before.split(/\r?\n/);
  const line = lines.length;
  const column = lines[lines.length - 1]?.length ?? 0;
  return { line, column: column + 1 };
}

function* iterateMatches(
  pattern: Pattern,
  content: string,
): Generator<{ value: string; index: number; pattern: Pattern }> {
  const regex = new RegExp(pattern.regex);
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    if (match.index === undefined) break;
    yield { value: match[0], index: match.index, pattern };
  }
}

const GENERIC_STRING_REGEX = /["'`]([A-Za-z0-9_\-+/=]{32,})["'`]/g;

const GENERIC_ALLOWED_PREFIXES = [
  "sha512-",
  "sha384-",
  "sha256-",
  "sha1-",
];

const GENERIC_IGNORE_REGEXES = [
  TON_ADDRESS_PATTERN,
  /^wallet=[EU][0-9A-Za-z_-]{45,}={0,2}$/,
  /^account=[EU][0-9A-Za-z_-]{45,}={0,2}$/,
];

function looksLikeHighEntropy(value: string) {
  if (value.length < 36) return false;
  if (value.includes("//")) return false;
  if (value.includes("/")) return false;
  if (GENERIC_ALLOWED_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return false;
  }

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSymbol = /[^a-zA-Z0-9]/.test(value);

  return hasLower && hasUpper && hasDigit && hasSymbol;
}

async function auditHardcodes(root: string) {
  const files: string[] = [];
  await walk(root, files);

  const detections: Detection[] = [];

  for (const file of files) {
    const relativeFile = path.relative(root, file);
    let content: string;
    try {
      content = await fs.readFile(file, "utf8");
    } catch (error) {
      console.warn(`Skipping ${file} due to read error:`, error);
      continue;
    }

    for (const pattern of SECRET_PATTERNS) {
      for (const { value, index } of iterateMatches(pattern, content)) {
        const { line, column } = computePosition(content, index);
        const detection = {
          pattern,
          file: relativeFile,
          line,
          column,
          value,
        };
        if (isAllowed(relativeFile, value)) continue;
        detections.push(detection);
      }
    }

    let genericMatch: RegExpExecArray | null;
    const genericRegex = new RegExp(GENERIC_STRING_REGEX);
    genericRegex.lastIndex = 0;
    while ((genericMatch = genericRegex.exec(content))) {
      const matchValue = genericMatch[1];
      if (!matchValue) continue;
      if (GENERIC_IGNORE_REGEXES.some((regex) => regex.test(matchValue))) {
        continue;
      }
      if (!looksLikeHighEntropy(matchValue)) continue;
      const { line, column } = computePosition(
        content,
        genericMatch.index ?? 0,
      );
      if (isAllowed(relativeFile, matchValue)) {
        continue;
      }
      detections.push({
        pattern: "generic",
        file: relativeFile,
        line,
        column,
        value: matchValue,
      });
    }
  }

  if (detections.length === 0) {
    console.log("✅ No suspicious hardcoded secrets detected.");
    return;
  }

  console.error("❗ Potential hardcoded secrets detected:\n");
  for (const detection of detections) {
    const label = detection.pattern === "generic"
      ? "generic"
      : detection.pattern.name;
    const message = detection.pattern === "generic"
      ? "High-entropy string literal"
      : detection.pattern.description;
    console.error(
      `${detection.file}:${detection.line}:${detection.column}\n  type: ${label}\n  note: ${message}\n  value: ${detection.value}\n`,
    );
  }

  process.exitCode = 1;
}

const rootDirectory = path.resolve(
  fileURLToPath(new URL("../../", import.meta.url)),
);
auditHardcodes(rootDirectory);
