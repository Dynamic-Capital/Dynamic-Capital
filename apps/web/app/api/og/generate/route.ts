import type { NextRequest } from "next/server";
import { ogDefaults } from "@/resources/og-defaults";

type OgContext = {
  title: string;
  description: string;
  domain: string;
  accent: string;
};

type ReactCreateElement = typeof import("react")["createElement"];
type OgReactElement = ReturnType<ReactCreateElement>;
type CreateElement = (
  type: string,
  props: Record<string, unknown> | null,
  ...children: unknown[]
) => OgReactElement;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const MAX_TITLE_LENGTH = 90;
const MAX_DESCRIPTION_LENGTH = 180;
const DEFAULT_ACCENT = "#22d3ee";
const CACHE_HEADER = "public, max-age=900, stale-while-revalidate=86400";

const DEFAULT_TITLE = ogDefaults.title;

const DEFAULT_DESCRIPTION = ogDefaults.description;

const DEFAULT_DOMAIN = resolveDefaultDomain();

function resolveDefaultDomain() {
  const fallback = "dynamic-capital.ondigitalocean.app";
  const raw = process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    `https://${fallback}`;

  try {
    return new URL(raw).hostname;
  } catch {
    return fallback;
  }
}

function sanitizeText(
  raw: string | null,
  fallback: string,
  limit: number,
) {
  if (!raw) {
    return fallback;
  }

  const trimmed = raw.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.length > limit ? `${trimmed.slice(0, limit - 1)}…` : trimmed;
}

function sanitizeDomain(raw: string | null) {
  if (!raw) return DEFAULT_DOMAIN;

  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_DOMAIN;

  try {
    const url = trimmed.includes("://")
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`);
    return url.hostname.toLowerCase();
  } catch {
    return DEFAULT_DOMAIN;
  }
}

function expandHex(value: string) {
  if (value.length === 4) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return value.toLowerCase();
}

function sanitizeAccent(raw: string | null) {
  if (!raw) return DEFAULT_ACCENT;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_ACCENT;

  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return expandHex(trimmed);
  }

  return DEFAULT_ACCENT;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapText(value: string, max = 42, maxLines = 3) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!word) continue;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= max) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > max ? word.slice(0, max) : word;
    }
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return lines.slice(0, maxLines);
}

function buildSvg({ title, description, domain, accent }: OgContext) {
  const safeTitle = escapeXml(title);
  const descriptionLines = wrapText(description).map((line, index) => {
    const safeLine = escapeXml(line);
    const dy = index === 0 ? 0 : 44;
    return `<tspan x="120" dy="${dy}">${safeLine}</tspan>`;
  });

  const safeDomain = escapeXml(domain);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="overlay" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.82" />
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.18" />
    </linearGradient>
  </defs>
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#bg)" />
  <rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="url(#overlay)" />
  <rect x="120" y="120" width="104" height="104" rx="28" fill="${accent}" />
  <text x="172" y="188" text-anchor="middle" font-family="'Inter','Segoe UI',sans-serif" font-weight="700" font-size="48" fill="#020617">DC</text>
  <text x="120" y="304" font-family="'Inter','Segoe UI',sans-serif" font-weight="700" font-size="64" fill="#E2E8F0">
    ${safeTitle}
  </text>
  <text x="120" y="372" font-family="'Inter','Segoe UI',sans-serif" font-size="32" fill="rgba(226, 232, 240, 0.82)" xml:space="preserve">
    ${descriptionLines.join("\n    ")}
  </text>
  <text x="120" y="540" font-family="'Inter','Segoe UI',sans-serif" font-weight="600" font-size="30" fill="#F8FAFC">Dynamic Capital</text>
  <text x="120" y="582" font-family="'Inter','Segoe UI',sans-serif" font-size="26" fill="rgba(226, 232, 240, 0.75)">${safeDomain}</text>
</svg>`;
}

function buildOgTree(
  createElement: CreateElement,
  data: OgContext,
): OgReactElement {
  return createElement(
    "div",
    {
      style: {
        width: `${OG_WIDTH}px`,
        height: `${OG_HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "96px 120px",
        backgroundImage: `linear-gradient(135deg, #020617 0%, #0f172a 100%)`,
        color: "#e2e8f0",
        fontFamily: "'Inter','Segoe UI',sans-serif",
      },
    },
    createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "28px",
        },
      },
      createElement("div", {
        style: {
          width: "110px",
          height: "110px",
          borderRadius: "28px",
          backgroundColor: data.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#020617",
          fontSize: "52px",
          fontWeight: 700,
        },
      }, "DC"),
      createElement(
        "div",
        null,
        createElement(
          "div",
          {
            style: {
              fontSize: "70px",
              fontWeight: 700,
              lineHeight: 1.05,
            },
          },
          data.title,
        ),
        createElement(
          "div",
          {
            style: {
              fontSize: "34px",
              color: "rgba(226, 232, 240, 0.82)",
              marginTop: "24px",
              maxWidth: "880px",
              lineHeight: 1.3,
            },
          },
          data.description,
        ),
      ),
    ),
    createElement(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: "48px",
        },
      },
      createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          },
        },
        createElement(
          "span",
          {
            style: { fontSize: "32px", fontWeight: 600 },
          },
          "Dynamic Capital",
        ),
        createElement(
          "span",
          {
            style: {
              fontSize: "26px",
              color: "rgba(226, 232, 240, 0.75)",
            },
          },
          data.domain,
        ),
      ),
      createElement("div", {
        style: {
          width: "220px",
          height: "220px",
          borderRadius: "9999px",
          background:
            `radial-gradient(circle, ${data.accent}33 0%, transparent 70%)`,
        },
      }),
    ),
  );
}

async function tryCreateImageResponse(context: OgContext) {
  try {
    const [{ ImageResponse }, React] = await Promise.all([
      import("next/og"),
      import("react"),
    ]);

    const element = buildOgTree(
      (React as typeof import("react")).createElement as CreateElement,
      context,
    );
    return new ImageResponse(element, {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        "Cache-Control": CACHE_HEADER,
      },
    });
  } catch (error) {
    return null;
  }
}

export const runtime = "edge";

export async function GET(request: Request | NextRequest) {
  const url = new URL(request.url);
  const context: OgContext = {
    title: sanitizeText(
      url.searchParams.get("title"),
      DEFAULT_TITLE,
      MAX_TITLE_LENGTH,
    ),
    description: sanitizeText(
      url.searchParams.get("description"),
      DEFAULT_DESCRIPTION,
      MAX_DESCRIPTION_LENGTH,
    ),
    domain: sanitizeDomain(url.searchParams.get("domain")),
    accent: sanitizeAccent(url.searchParams.get("accent")),
  };

  const imageResponse = await tryCreateImageResponse(context);
  if (imageResponse) {
    return imageResponse;
  }

  const svg = buildSvg(context);
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": CACHE_HEADER,
    },
  });
}
