import { afterEach, expect, test, vi } from "vitest";

const originalEnv = { ...process.env };

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const corsEnvKeys = [
  "ALLOWED_ORIGINS",
  "SITE_URL",
  "NEXT_PUBLIC_SITE_URL",
  "URL",
  "APP_URL",
  "PUBLIC_URL",
  "DEPLOY_URL",
  "DEPLOYMENT_URL",
  "DIGITALOCEAN_APP_URL",
  "DIGITALOCEAN_APP_SITE_DOMAIN",
  "VERCEL_URL",
];

const setCorsEnv = (overrides: Record<string, string | undefined>) => {
  for (const key of corsEnvKeys) {
    delete process.env[key];
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const loadHttpModule = async () => {
  vi.resetModules();
  return await import("./http.ts");
};

afterEach(() => {
  restoreEnv();
  vi.resetModules();
  vi.restoreAllMocks();
});

test("normalises configured origins from ALLOWED_ORIGINS", async () => {
  setCorsEnv({ ALLOWED_ORIGINS: "example.com, https://foo.com, not a url" });
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const { buildCorsHeaders } = await loadHttpModule();

  expect(buildCorsHeaders("https://example.com")).toMatchObject({
    "access-control-allow-origin": "https://example.com",
    vary: "Origin",
  });
  expect(buildCorsHeaders("https://foo.com")).toMatchObject({
    "access-control-allow-origin": "https://foo.com",
    vary: "Origin",
  });
  expect(warnSpy).toHaveBeenCalledWith(
    "[CORS] Ignoring invalid ALLOWED_ORIGINS entries: not a url",
  );
});

test("infers http for localhost origins without an explicit scheme", async () => {
  setCorsEnv({ ALLOWED_ORIGINS: "localhost:3000" });

  const { buildCorsHeaders } = await loadHttpModule();

  expect(buildCorsHeaders("http://localhost:3000")).toMatchObject({
    "access-control-allow-origin": "http://localhost:3000",
    vary: "Origin",
  });
});

test("jsonResponse merges existing vary headers", async () => {
  setCorsEnv({ ALLOWED_ORIGINS: "example.com" });

  const { jsonResponse } = await loadHttpModule();

  const req = new Request("https://example.com/api", {
    headers: { origin: "https://example.com" },
  });

  const response = jsonResponse(
    { ok: true },
    { headers: { vary: "Accept-Encoding" } },
    req,
  );

  expect(response.headers.get("access-control-allow-origin")).toBe(
    "https://example.com",
  );
  expect(response.headers.get("vary")).toBe("Accept-Encoding, Origin");
});

test("allows wildcard origins without forcing vary header", async () => {
  setCorsEnv({ ALLOWED_ORIGINS: "" });

  const { buildCorsHeaders, jsonResponse } = await loadHttpModule();

  const cors = buildCorsHeaders("https://foo.com");
  expect(cors["access-control-allow-origin"]).toBe("*");
  expect(cors["vary"]).toBeUndefined();

  const response = jsonResponse(
    {},
    { headers: { vary: "Accept-Encoding" } },
    new Request("https://example.com/api", {
      headers: { origin: "https://foo.com" },
    }),
  );

  expect(response.headers.get("vary")).toBe("Accept-Encoding");
});
