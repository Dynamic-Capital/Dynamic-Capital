import { chromium, type BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const defaultViewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
];

function parseRoutes(input: string | undefined): string[] {
  if (!input || !input.trim()) {
    return ['/'];
  }

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map((value) => String(value));
    }
  } catch (error) {
    // Ignore JSON parse errors and fall back to comma-separated parsing.
  }

  return input
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean);
}

function parseViewports(input: string | undefined) {
  if (!input || !input.trim()) {
    return defaultViewports;
  }

  try {
    const parsed = JSON.parse(input);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'name' in item &&
          'width' in item &&
          'height' in item,
      )
    ) {
      return parsed.map((item) => ({
        name: String(item.name),
        width: Number(item.width),
        height: Number(item.height),
      }));
    }
  } catch (error) {
    console.warn('Unable to parse custom viewports, falling back to defaults.');
  }

  return defaultViewports;
}

function sanitizeRoute(route: string): string {
  if (route === '/' || route === '') {
    return 'home';
  }

  return (
    route
      .replace(/\?.*$/, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'page'
  );
}

async function ensureContext(browserContext: BrowserContext, viewport: { name: string; width: number; height: number }) {
  const page = await browserContext.newPage();
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  return page;
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const routes = parseRoutes(process.env.ROUTES);
  const viewports = parseViewports(process.env.VIEWPORTS);

  if (!baseUrl) {
    throw new Error('BASE_URL is required.');
  }

  fs.mkdirSync('screenshots', { recursive: true });

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();

    for (const route of routes) {
      for (const viewport of viewports) {
        const page = await ensureContext(context, viewport);
        const url = new URL(route, baseUrl).toString();
        await page.goto(url, { waitUntil: 'networkidle' });
        const safeRoute = sanitizeRoute(route);
        const fileName = `${safeRoute || 'page'}-${viewport.name}.png`;
        const filePath = path.join('screenshots', fileName);
        await page.screenshot({ path: filePath, fullPage: true });
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
