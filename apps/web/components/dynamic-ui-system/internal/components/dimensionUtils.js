const STATIC_SPACE_TOKENS = new Set([
  "0",
  "1",
  "2",
  "4",
  "8",
  "12",
  "16",
  "20",
  "24",
  "32",
  "40",
  "48",
  "56",
  "64",
  "80",
  "104",
  "128",
  "160",
]);

const RESPONSIVE_TOKENS = new Set(["xs", "s", "m", "l", "xl"]);

const DIMENSION_KEYWORDS = new Set([
  "auto",
  "min-content",
  "max-content",
  "fit-content",
  "fit-content(100%)",
]);

const CSS_INHERITANCE_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

const FUNCTION_PREFIXES = ["var(", "calc(", "min(", "max(", "clamp("];

const LENGTH_PATTERN = /^(?:-?\d*\.?\d+)(?:px|rem|em|vh|vw|vmin|vmax|%)$/;

const isString = (value) => typeof value === "string";

const normalizeString = (value) => {
  if (!isString(value)) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseDimensionValue = (value, type) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    return `${value}rem`;
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }
  if (STATIC_SPACE_TOKENS.has(normalized)) {
    return `var(--static-space-${normalized})`;
  }
  if (RESPONSIVE_TOKENS.has(normalized)) {
    return `var(--responsive-${type}-${normalized})`;
  }
  const lower = normalized.toLowerCase();
  if (DIMENSION_KEYWORDS.has(lower) || CSS_INHERITANCE_KEYWORDS.has(lower)) {
    return normalized;
  }
  if (normalized.startsWith("fit-content")) {
    return normalized;
  }
  if (FUNCTION_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return normalized;
  }
  if (LENGTH_PATTERN.test(normalized)) {
    return normalized;
  }
  return normalized;
};

const clampDimensionToViewport = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    if (value === 0) {
      return 0;
    }
    return `min(100%, ${value}px)`;
  }
  const normalized = normalizeString(value);
  if (!normalized) {
    return undefined;
  }
  const lower = normalized.toLowerCase();
  if (
    lower === "0" ||
    DIMENSION_KEYWORDS.has(lower) ||
    CSS_INHERITANCE_KEYWORDS.has(lower)
  ) {
    return normalized;
  }
  if (normalized.startsWith("fit-content")) {
    return normalized;
  }
  if (normalized.startsWith("min(100%")) {
    return normalized;
  }
  if (
    normalized.startsWith("min(") ||
    normalized.startsWith("max(") ||
    normalized.startsWith("clamp(")
  ) {
    return normalized;
  }
  return `min(100%, ${normalized})`;
};

export { clampDimensionToViewport, parseDimensionValue };
