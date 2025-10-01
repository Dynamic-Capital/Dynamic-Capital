export type LogLevel = "debug" | "info" | "warn" | "error";

type ConsoleMethod = "log" | "warn" | "error";

const levelToConsole: Record<LogLevel, ConsoleMethod> = {
  debug: "log",
  info: "log",
  warn: "warn",
  error: "error",
};

export interface LogContext {
  [key: string]: unknown;
}

export function log(
  level: LogLevel,
  message: string,
  context: LogContext = {},
): void {
  const consoleMethod = levelToConsole[level];
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  console[consoleMethod](JSON.stringify(entry));
}
