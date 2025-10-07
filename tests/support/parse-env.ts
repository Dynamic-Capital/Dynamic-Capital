const LINE_BREAK_PATTERN = /\r?\n/;
const KEY_VALUE_PATTERN = /^\s*(?:export\s+)?([^=\s]+)\s*=\s*(.*)\s*$/;

function stripQuotes(value: string): string {
  if (value === undefined) {
    return "";
  }

  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      // Fall through to manual unescaping if JSON.parse fails.
    }

    return value
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\f/g, "\f")
      .replace(/\\v/g, "\v")
      .replace(/\\\\/g, "\\")
      .replace(/\\"/g, '"');
  }

  if (value.length >= 2 && value[0] === "'" && value[value.length - 1] === "'") {
    return value.slice(1, -1);
  }

  return value;
}

export function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of contents.split(LINE_BREAK_PATTERN)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    const match = line.match(KEY_VALUE_PATTERN);

    if (!match) {
      continue;
    }

    const [, key, rawValue = ""] = match;
    result[key] = stripQuotes(rawValue);
  }

  return result;
}
