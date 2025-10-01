const DEFAULT_DIVIDER_LENGTH = 48;

function toLines(value) {
  if (value === undefined || value === null) return [];
  const array = Array.isArray(value) ? value : [value];
  return array
    .flatMap((item) => String(item).split("\n"))
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function output(emoji, message, options = {}) {
  const { details, indent = "   ", stream = console.log, bullet = "•" } =
    options;
  const messageLines = toLines(message);
  if (messageLines.length === 0) {
    stream(`${emoji}`);
    return;
  }

  const [firstLine, ...rest] = messageLines;
  const formatted = [`${emoji} ${firstLine}`];
  for (const line of rest) {
    formatted.push(`${indent}${line}`);
  }

  for (const detail of toLines(details)) {
    formatted.push(`${indent}${bullet} ${detail}`);
  }

  stream(formatted.join("\n"));
}

export function banner(title, subtitle) {
  const lines = [title, subtitle].filter(Boolean).map((line) => line.length);
  const length = Math.max(
    DEFAULT_DIVIDER_LENGTH,
    ...lines.map((len) => len + 6),
  );
  const border = "═".repeat(length);

  console.log(`\n${border}`);
  console.log(`✨ ${title}`);
  if (subtitle) {
    console.log(`   ${subtitle}`);
  }
  console.log(`${border}\n`);
}

export function divider(length = DEFAULT_DIVIDER_LENGTH) {
  console.log("─".repeat(length));
}

export function step(message, options) {
  output("🚀", message, options);
}

export function info(message, options) {
  output("💡", message, options);
}

export function success(message, options) {
  output("🎉", message, options);
}

export function warn(message, options = {}) {
  output("⚠️", message, { ...options, stream: console.warn });
}

export function error(message, options = {}) {
  output("❌", message, { ...options, stream: console.error });
}

export function note(message, options) {
  output("📝", message, options);
}

export function celebrate(message, options) {
  output("🥳", message, options);
}
