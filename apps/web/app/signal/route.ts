import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

export function GET() {
  const filePath = join(process.cwd(), "_static", "index.html");
  const html = readFileSync(filePath, "utf8");
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
