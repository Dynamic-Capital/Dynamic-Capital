import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

interface CliOptions {
  name: string;
  appDir: string;
  testDir: string;
  withApi: boolean;
  force: boolean;
}

interface TemplateContext {
  routeName: string;
  componentName: string;
  layoutName: string;
  title: string;
  description: string;
  baseDir: string;
  relativeImport: string;
}

function parseArgs(argv: string[]): CliOptions {
  if (!argv.length) {
    throw new Error(
      "Usage: generate-route.ts --name <segment> [--app <dir>] [--test <dir>] [--with-api] [--force]",
    );
  }

  let name = "";
  let appDir = "apps/web/app";
  let testDir = "tests/routes";
  let withApi = false;
  let force = false;

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--name" || value === "-n") {
      const next = argv[index + 1];
      if (!next) throw new Error("--name flag requires a value");
      name = next;
      index += 1;
      continue;
    }
    if (value === "--app") {
      const next = argv[index + 1];
      if (!next) throw new Error("--app flag requires a directory");
      appDir = next;
      index += 1;
      continue;
    }
    if (value === "--test") {
      const next = argv[index + 1];
      if (!next) throw new Error("--test flag requires a directory");
      testDir = next;
      index += 1;
      continue;
    }
    if (value === "--with-api") {
      withApi = true;
      continue;
    }
    if (value === "--force") {
      force = true;
      continue;
    }
    if (!name) {
      name = value;
      continue;
    }
  }

  if (!name) {
    throw new Error("Provide the route segment name via --name <segment>");
  }

  return {
    name,
    appDir,
    testDir,
    withApi,
    force,
  };
}

function toSegments(name: string): string[] {
  return name
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function toPascalCase(value: string): string {
  const cleaned = value.replace(/\[(.+?)\]/g, "$1");
  return cleaned
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function toTitleCase(segment: string): string {
  const cleaned = segment.replace(/\[(.+?)\]/g, "$1");
  return cleaned
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildTitle(name: string): string {
  const segments = toSegments(name);
  const formatted = segments.map(toTitleCase);
  return formatted.join(" / ") || "Dynamic Route";
}

function buildComponentName(name: string): string {
  const segments = toSegments(name);
  return segments.map(toPascalCase).join("") || "Route";
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith("\n") ? content : `${content}\n`;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function writeFileSafely(
  path: string,
  content: string,
  force: boolean,
): Promise<boolean> {
  const exists = await fileExists(path);
  if (exists && !force) {
    console.log(`[generate:route] Skipping existing file ${path}`);
    return false;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, ensureTrailingNewline(content));
  console.log(`[generate:route] Wrote ${path}`);
  return true;
}

function buildLayoutTemplate(context: TemplateContext): string {
  return `import type { ReactNode } from "react";

interface ${context.layoutName}Props {
  children: ReactNode;
}

export default function ${context.layoutName}({ children }: ${context.layoutName}Props) {
  return (
    <section className="flex min-h-screen flex-col gap-6 bg-background px-6 py-12">
      {children}
    </section>
  );
}
`;
}

function buildPageTemplate(context: TemplateContext): string {
  return `import type { Metadata } from "next";
import { logRouteRequest } from "./observability";
import { RouteTelemetry } from "./route-telemetry";

const ROUTE_LABEL = "${context.routeName}";

export const metadata: Metadata = {
  title: "${context.title} | Dynamic Capital",
  description: "${context.description}",
};

export default function ${context.componentName}Page() {
  logRouteRequest({ label: ROUTE_LABEL, detail: { event: "render" } });
  return (
    <main className="space-y-8">
      <RouteTelemetry name={ROUTE_LABEL} />
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">${context.title}</h1>
        <p className="text-muted-foreground">${context.description}</p>
      </header>
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-medium">Getting started</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Replace this placeholder with the real experience for {"${context.routeName}"}.
          Keep telemetry wiring in place so new widgets report usage automatically.
        </p>
      </section>
    </main>
  );
}
`;
}

function buildLoadingTemplate(): string {
  return `export default function Loading() {
  return (
    <section className="space-y-4">
      <div className="h-10 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-24 w-full animate-pulse rounded bg-muted" />
    </section>
  );
}
`;
}

function buildErrorTemplate(context: TemplateContext): string {
  return `"use client";

import { useEffect } from "react";
import { logRouteRequest } from "./observability";

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ${context.componentName}Error({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    logRouteRequest({ label: "${context.routeName}:error", detail: { message: error.message, digest: error.digest } });
  }, [error]);

  return (
    <section className="space-y-4 rounded border border-destructive/50 bg-destructive/10 p-6">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
      <p className="text-sm text-destructive">{error.message}</p>
      <button
        className="inline-flex w-fit items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
        onClick={() => reset()}
      >
        Try again
      </button>
    </section>
  );
}
`;
}

function buildObservabilityTemplate(_context: TemplateContext): string {
  return `interface RouteLogOptions {
  label: string;
  request?: Request;
  detail?: Record<string, unknown>;
}

export function logRouteRequest({ label, request, detail }: RouteLogOptions): void {
  const payload: Record<string, unknown> = {
    label,
    detail: detail ?? {},
    timestamp: new Date().toISOString(),
  };
  if (request) {
    try {
      const url = new URL(request.url);
      payload.method = request.method;
      payload.path = url.pathname;
    } catch (_error) {
      payload.method = request.method;
    }
  }
  // eslint-disable-next-line no-console
  console.info('[route] ' + label, payload);
}
`;
}

function buildTelemetryTemplate(): string {
  return `"use client";

import { useEffect } from "react";

export interface RouteTelemetryProps {
  name: string;
  payload?: Record<string, unknown>;
}

export function RouteTelemetry({ name, payload }: RouteTelemetryProps) {
  const serialised = JSON.stringify(payload ?? {});
  useEffect(() => {
    const detail = {
      name,
      payload: payload ?? {},
      timestamp: new Date().toISOString(),
    };
    window.dispatchEvent(new CustomEvent("route:telemetry", { detail }));
    // eslint-disable-next-line no-console
    console.info("[route] client", detail);
  }, [name, serialised]);

  return null;
}
`;
}

function buildApiRouteTemplate(context: TemplateContext): string {
  return `import { NextResponse } from "next/server";
import { logRouteRequest } from "./observability";

export async function GET(request: Request) {
  logRouteRequest({ label: "${context.routeName}:GET", request });
  return NextResponse.json({ status: "ok", route: "${context.routeName}" });
}

export function OPTIONS() {
  return NextResponse.json({ status: "ok" }, { headers: { Allow: "GET,OPTIONS" } });
}
`;
}

function buildTestTemplate(context: TemplateContext): string {
  return `import React from "react";
import { describe, expect, it } from "vitest";
import Page, { metadata } from "${context.relativeImport}";

describe("Route ${context.routeName}", () => {
  it("defines a Dynamic Capital title", () => {
    expect(metadata.title).toContain("Dynamic Capital");
  });

  it("renders a valid React element", () => {
    const element = Page();
    expect(React.isValidElement(element)).toBe(true);
  });
});
`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const segments = toSegments(options.name);
  const componentName = buildComponentName(options.name);
  const layoutName = `${componentName}Layout`;
  const title = buildTitle(options.name);
  const description =
    `Scaffold for ${options.name} route. Replace with product copy.`;
  const baseDir = resolve(options.appDir, ...segments);
  const pagePath = join(baseDir, "page.tsx");
  const layoutPath = join(baseDir, "layout.tsx");
  const loadingPath = join(baseDir, "loading.tsx");
  const errorPath = join(baseDir, "error.tsx");
  const observabilityPath = join(baseDir, "observability.ts");
  const telemetryPath = join(baseDir, "route-telemetry.tsx");
  const apiRoutePath = join(baseDir, "route.ts");

  const testPath = join(resolve(options.testDir), ...segments) + ".test.tsx";
  const relativeImport = relative(dirname(testPath), pagePath)
    .replace(/\\/g, "/")
    .replace(/\.tsx?$/, "");

  const context: TemplateContext = {
    routeName: options.name,
    componentName,
    layoutName,
    title,
    description,
    baseDir,
    relativeImport,
  };

  await writeFileSafely(
    layoutPath,
    buildLayoutTemplate(context),
    options.force,
  );
  await writeFileSafely(pagePath, buildPageTemplate(context), options.force);
  await writeFileSafely(loadingPath, buildLoadingTemplate(), options.force);
  await writeFileSafely(errorPath, buildErrorTemplate(context), options.force);
  await writeFileSafely(
    observabilityPath,
    buildObservabilityTemplate(context),
    options.force,
  );
  await writeFileSafely(telemetryPath, buildTelemetryTemplate(), options.force);
  if (options.withApi) {
    await writeFileSafely(
      apiRoutePath,
      buildApiRouteTemplate(context),
      options.force,
    );
  }
  await writeFileSafely(testPath, buildTestTemplate(context), options.force);

  console.log(`Route scaffold created at ${baseDir}`);
}

main().catch((error) => {
  console.error("[generate:route] Failed to scaffold route");
  console.error(error);
  process.exitCode = 1;
});
