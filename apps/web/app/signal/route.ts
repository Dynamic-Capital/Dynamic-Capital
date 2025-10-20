import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function resolveProcessCwd(): string {
  if (
    typeof globalThis === "object" &&
    typeof (globalThis as { process?: unknown }).process === "object" &&
    (globalThis as { process?: unknown }).process !== null
  ) {
    const { process } = globalThis as {
      process?: { cwd?: () => string };
    };

    if (process?.cwd) {
      return process.cwd();
    }
  }

  throw new Error("Node.js process context is unavailable");
}

export function GET() {
  const filePath = join(resolveProcessCwd(), "_static", "index.html");
  const html = readFileSync(filePath, "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
