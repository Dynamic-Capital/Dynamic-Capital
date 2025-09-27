/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { mna, nf } from "../_shared/http.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { serveStatic, StaticOpts } from "../_shared/static.ts";
import { createClient } from "@supabase/supabase-js";
import { ENHANCED_SECURITY_HEADERS, withSecurity } from "./security.ts";
import { DISABLE_HTML_COMPRESSION, smartCompress } from "./compression.ts";
import { fetchFromStorage } from "./storage.ts";
import { handleApiRoutes } from "./routes.ts";

// Env setup
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const BUCKET = optionalEnv("MINIAPP_BUCKET" as any) ?? "miniapp";
const INDEX_KEY = optionalEnv("MINIAPP_INDEX_KEY" as any) ?? "index.html";
const SERVE_FROM_STORAGE = optionalEnv("SERVE_FROM_STORAGE" as any) === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Serve static files from the built React app with fallback
async function serveStaticIndex(): Promise<Response | null> {
  try {
    const staticIndexPath = new URL("./static/index.html", import.meta.url);
    const htmlContent = await Deno.readTextFile(staticIndexPath);
    console.log(
      `[miniapp] Serving static index.html (${htmlContent.length} bytes)`,
    );
    return new Response(htmlContent, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache",
        "x-served-from": "static",
      },
    });
  } catch (e) {
    console.warn("[miniapp] Static index.html not found:", e.message);
    return null;
  }
}

// Embedded React App HTML Template
const REACT_APP_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <title>Dynamic Capital • Mini App</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      margin: 0;
      padding: 1rem;
      background: var(--tg-theme-bg-color, #ffffff);
      color: var(--tg-theme-text-color, #000000);
      min-height: 100vh;
    }

    #app {
      max-width: 400px;
      margin: 0 auto;
    }

    .card {
      background: var(--tg-theme-secondary-bg-color, #f1f3f4);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--tg-theme-text-color, #000000);
    }

    h2 {
      margin: 0 0 1rem 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--tg-theme-text-color, #000000);
    }

    .muted {
      color: var(--tg-theme-hint-color, #708499);
      font-size: 0.9rem;
      line-height: 1.4;
    }

    .row {
      display: flex;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .btn {
      background: var(--tg-theme-button-color, #007aff);
      color: var(--tg-theme-button-text-color, #ffffff);
      border: none;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
      flex: 1;
    }

    .btn:hover {
      opacity: 0.8;
    }

    .btn.secondary {
      background: var(--tg-theme-secondary-bg-color, #f1f3f4);
      color: var(--tg-theme-text-color, #000000);
      border: 1px solid var(--tg-theme-hint-color, #708499);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .kv {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--tg-theme-hint-color, #e5e5ea);
    }

    .kv:last-child {
      border-bottom: none;
    }

    code {
      background: var(--tg-theme-secondary-bg-color, #f1f3f4);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      font-size: 0.8rem;
      word-break: break-all;
    }

    .success {
      color: #28a745;
    }

    .error {
      color: #dc3545;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="card">
      <h1>Dynamic Capital</h1>
      <p class="muted">Welcome to the Mini App. Use the buttons below to verify the backend and your Telegram WebApp context.</p>
      <div class="row">
        <button id="btn-version" class="btn">Check /miniapp/version</button>
        <button id="btn-verify" class="btn secondary" title="Calls /verify-initdata if deployed">Verify initData</button>
      </div>
      <div class="kv"><div>WebApp user</div><div><span id="userName" class="muted">—</span></div></div>
      <div class="kv"><div>Theme</div><div><span id="theme" class="muted">—</span></div></div>
      <div class="kv"><div>Mini App URL</div><div><code id="miniUrl">—</code></div></div>
    </div>

    <div class="card">
      <h2>Status</h2>
      <div id="status" class="muted">No checks yet.</div>
    </div>

    <div class="card">
      <p class="muted">
        Tip: Your bot's WebApp button should link to this exact HTTPS page.<br />
        Example: <code>https://&lt;project-ref&gt;.functions.supabase.co/miniapp/</code>
      </p>
    </div>
  </div>

  <script>
    const tg = window.Telegram?.WebApp;
    if (tg) tg.ready();

    // Update UI with Telegram data
    function updateUI() {
      const userName = tg?.initDataUnsafe?.user?.first_name || 'demo_user';
      const theme = tg?.colorScheme || 'light';
      
      const userNameEl = document.getElementById('userName');
      const themeEl = document.getElementById('theme');
      const miniUrlEl = document.getElementById('miniUrl');

      if (userNameEl) userNameEl.textContent = userName;
      if (themeEl) themeEl.textContent = theme;
      if (miniUrlEl) miniUrlEl.textContent = window.location.href;
    }

    function setStatus(message, type = 'info') {
      const statusEl = document.getElementById('status');
      const className = type === 'success' ? 'success' : type === 'error' ? 'error' : 'muted';
      statusEl.innerHTML = \`<span class="\${className}">\${message}</span>\`;
    }

    async function checkVersion() {
      try {
        const response = await fetch('/miniapp/version');
        const data = await response.json();
        setStatus(\`✓ Version: \${data.name} (\${data.ts})\`, 'success');
      } catch (error) {
        setStatus('✗ Version check failed', 'error');
      }
    }

    async function verifyInitData() {
      try {
        const initData = tg?.initData;
        if (!initData) {
          setStatus('✗ No initData available', 'error');
          return;
        }

        const response = await fetch('/verify-initdata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData })
        });
        
        if (response.ok) {
          const data = await response.json();
          setStatus(\`✓ InitData verified: \${data.valid ? 'Valid' : 'Invalid'}\`, 'success');
        } else {
          setStatus(\`✗ Verification failed: \${response.status}\`, 'error');
        }
      } catch (error) {
        setStatus('✗ Verification error', 'error');
      }
    }

    // Add event listeners
    const versionBtn = document.getElementById('btn-version');
    const verifyBtn = document.getElementById('btn-verify');

    if (versionBtn) versionBtn.addEventListener('click', checkVersion);
    if (verifyBtn) verifyBtn.addEventListener('click', verifyInitData);
    
    // Initialize
    updateUI();
    setStatus('Ready for testing. Use buttons above to verify backend.');
  </script>
</body>
</html>`;

console.log(
  "[miniapp] Configuration - SERVE_FROM_STORAGE:",
  SERVE_FROM_STORAGE,
  "DISABLE_HTML_COMPRESSION:",
  DISABLE_HTML_COMPRESSION,
);

// API Routes Handler
export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/^\/functions\/v1/, "");
  const path = url.pathname;
  const normalizedPath = path.startsWith("/miniapp")
    ? (() => {
      const stripped = path.slice("/miniapp".length) || "/";
      return stripped.startsWith("/") ? stripped : `/${stripped}`;
    })()
    : path;

  const logPath = normalizedPath === path
    ? path
    : `${path} -> ${normalizedPath}`;

  console.log(`[miniapp] ${req.method} ${logPath}`);

  // Handle version endpoint for health checks and deployment verification
  if (path === "/version") {
    return withSecurity(
      new Response(
        JSON.stringify({
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          healthy: true,
          deployment_id: Deno.env.get("DENO_DEPLOYMENT_ID") || "unknown",
        }),
        {
          headers: { "content-type": "application/json" },
        },
      ),
    );
  }

  // Try to use the static server helper for SPA routes
  if (
    path === "/" ||
    (path.startsWith("/miniapp") &&
      !path.startsWith("/miniapp/api") &&
      !path.startsWith("/miniapp/assets") &&
      !path.startsWith("/miniapp/version"))
  ) {
    try {
      const staticOpts: StaticOpts = {
        rootDir: new URL("./static/", import.meta.url),
        spaRoots: ["/"],
        security: ENHANCED_SECURITY_HEADERS,
        extraFiles: [
          "/favicon.ico",
          "/favicon.svg",
          "/vite.svg",
          "/robots.txt",
          "/sitemap.xml",
        ],
      };

      // Try static serving first (normalize /miniapp prefix if present)
      const staticReq = path.startsWith("/miniapp")
        ? (() => {
          const u = new URL(req.url);
          u.pathname = u.pathname.replace(/^\/miniapp/, "");
          return new Request(u, req);
        })()
        : req;
      const staticResponse = await serveStatic(staticReq, staticOpts);

      // If static serving succeeds, add diagnostic header and return
      if (staticResponse.status === 200) {
        const headers = new Headers(staticResponse.headers);
        headers.set("x-served-from", "static");
        console.log(`[miniapp] Served ${path} from static build`);
        return new Response(staticResponse.body, {
          status: staticResponse.status,
          headers,
        });
      }
    } catch (e) {
      console.warn(`[miniapp] Static serving failed for ${path}:`, e.message);
    }
  }

  // HEAD routes
  if (req.method === "HEAD") {
    if (path === "/" || path === "/miniapp" || path === "/miniapp/") {
      return withSecurity(
        new Response(null, {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "x-served-from": "head-check",
          },
        }),
      );
    }
    if (path === "/miniapp/version") {
      return withSecurity(
        new Response(null, {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "x-served-from": "head-check",
          },
        }),
      );
    }
    return withSecurity(nf("Not Found"));
  }

  if (req.method !== "GET") return withSecurity(mna());

  // GET / or /miniapp/ → index.html (with multiple fallback strategies)
  if (path === "/" || path === "/miniapp" || path === "/miniapp/") {
    let htmlContent: string;
    let servedFrom: string;

    // Strategy 1: Serve from storage if enabled
    if (SERVE_FROM_STORAGE) {
      const arr = await fetchFromStorage(supabase, BUCKET, INDEX_KEY);
      if (arr) {
        htmlContent = new TextDecoder().decode(arr);
        servedFrom = "storage";
        console.log(`[miniapp] Serving from storage: ${BUCKET}/${INDEX_KEY}`);
      } else {
        console.warn(`[miniapp] Storage fetch failed, trying static build`);
        const staticResp = await serveStaticIndex();
        if (staticResp) {
          const headers = new Headers(staticResp.headers);
          headers.set("x-served-from", "static-fallback");
          return withSecurity(
            new Response(staticResp.body, {
              status: staticResp.status,
              headers,
            }),
          );
        }
        // Final fallback to embedded
        htmlContent = REACT_APP_HTML;
        servedFrom = "embedded-fallback";
        console.log("[miniapp] Using embedded React app as final fallback");
      }
    } else {
      // Strategy 2: Try static build first
      const staticResp = await serveStaticIndex();
      if (staticResp) {
        const headers = new Headers(staticResp.headers);
        headers.set("x-served-from", "static");
        return withSecurity(
          new Response(staticResp.body, {
            status: staticResp.status,
            headers,
          }),
        );
      }

      // Fallback to embedded
      htmlContent = REACT_APP_HTML;
      servedFrom = "embedded";
      console.log("[miniapp] Serving embedded React app");
    }

    const arr = new TextEncoder().encode(htmlContent);
    const contentType = "text/html; charset=utf-8";
    const { stream, encoding } = smartCompress(arr, req, contentType);

    const headers: Record<string, string> = {
      "content-type": contentType,
      "cache-control": "no-cache",
      "x-served-from": servedFrom,
    };

    if (encoding) {
      headers["content-encoding"] = encoding;
      console.log(`[miniapp] Applied ${encoding} compression to HTML response`);
    }

    console.log(
      `[miniapp] Serving index.html (${arr.length} bytes) with headers:`,
      headers,
    );
    const resp = new Response(stream, { status: 200, headers });
    return withSecurity(resp);
  }

  // GET /miniapp/version
  if (path === "/miniapp/version") {
    const versionData = {
      name: "miniapp",
      ts: new Date().toISOString(),
      serveFromStorage: SERVE_FROM_STORAGE,
      htmlCompressionDisabled: DISABLE_HTML_COMPRESSION,
    };

    const body = new TextEncoder().encode(JSON.stringify(versionData));
    const contentType = "application/json; charset=utf-8";
    const { stream, encoding } = smartCompress(body, req, contentType);

    const headers: Record<string, string> = {
      "content-type": contentType,
      "x-served-from": "version-endpoint",
    };
    if (encoding) headers["content-encoding"] = encoding;

    const resp = new Response(stream, { status: 200, headers });
    console.log(`[miniapp] Served version endpoint`);
    return withSecurity(resp);
  }

  // GET /assets/* or /miniapp/assets/* → serve from static build or storage
  if (path.startsWith("/assets/") || path.startsWith("/miniapp/assets/")) {
    const assetPath = path.startsWith("/miniapp/assets/")
      ? path.slice("/miniapp/assets/".length)
      : path.slice("/assets/".length);
    let arr: Uint8Array | null = null;
    let servedFrom: string;

    // Try static build first
    try {
      const staticAssetPath = new URL(
        `./static/assets/${assetPath}`,
        import.meta.url,
      );
      arr = await Deno.readFile(staticAssetPath);
      servedFrom = "static";
      console.log(`[miniapp] Served asset ${assetPath} from static build`);
    } catch {
      // Fallback to storage
      arr = await fetchFromStorage(supabase, BUCKET, `assets/${assetPath}`);
      if (arr) {
        servedFrom = "storage";
        console.log(`[miniapp] Served asset ${assetPath} from storage`);
      } else {
        console.warn(
          `[miniapp] Asset ${assetPath} not found in static or storage`,
        );
        return withSecurity(nf("Asset not found"));
      }
    }

    if (!arr) {
      return withSecurity(nf("Asset not found"));
    }

    const contentType = (() => {
      if (assetPath.endsWith(".js")) return "application/javascript";
      if (assetPath.endsWith(".css")) return "text/css";
      if (assetPath.endsWith(".html")) return "text/html; charset=utf-8";
      if (assetPath.endsWith(".json")) return "application/json";
      if (assetPath.endsWith(".svg")) return "image/svg+xml";
      if (assetPath.endsWith(".png")) return "image/png";
      if (assetPath.endsWith(".jpg") || assetPath.endsWith(".jpeg")) {
        return "image/jpeg";
      }
      if (assetPath.endsWith(".ico")) return "image/x-icon";
      return "application/octet-stream";
    })();

    const headers: Record<string, string> = {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-served-from": servedFrom,
    };

    const resp = new Response(arr, { status: 200, headers });
    return withSecurity(resp);
  }

  // API Routes
  if (normalizedPath.startsWith("/api/")) {
    return handleApiRoutes(req, normalizedPath, supabase);
  }

  // Unknown path → 404
  console.log(`[miniapp] Path not found: ${path}`);
  return withSecurity(nf("Not Found"));
}

if (import.meta.main) {
  if (typeof Deno !== "undefined" && "serve" in Deno) {
    Deno.serve(handler);
  }
}

export default handler;
