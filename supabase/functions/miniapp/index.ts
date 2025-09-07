import { mna, nf, json } from "../_shared/http.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { serveStatic, StaticOpts } from "../_shared/static.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Env setup
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireEnv([
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const BUCKET = optionalEnv("MINIAPP_BUCKET") ?? "miniapp";
const INDEX_KEY = optionalEnv("MINIAPP_INDEX_KEY") ?? "index.html";
const SERVE_FROM_STORAGE = optionalEnv("SERVE_FROM_STORAGE") === "true";
const DISABLE_HTML_COMPRESSION = optionalEnv("DISABLE_HTML_COMPRESSION") === "true";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Enhanced security headers with better CSP for Telegram and Lovable preview
const ENHANCED_SECURITY_HEADERS = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff", 
  "permissions-policy": "geolocation=(), microphone=(), camera=()",
  "content-security-policy":
    "default-src 'self' https://*.telegram.org https://telegram.org; " +
    "script-src 'self' 'unsafe-inline' https://*.telegram.org; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.functions.supabase.co https://*.supabase.co wss://*.supabase.co; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'self' https://*.telegram.org https://telegram.org https://*.supabase.co https://*.lovable.dev;",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-frame-options": "ALLOWALL",
} as const;

function withSecurity(resp: Response, extra: Record<string, string> = {}) {
  const h = new Headers(resp.headers);

  // Preserve original content-type if it exists
  const originalContentType = resp.headers.get("content-type");

  for (const [k, v] of Object.entries(ENHANCED_SECURITY_HEADERS)) h.set(k, v);
  for (const [k, v] of Object.entries(extra)) h.set(k, v);

  // Ensure content-type is preserved and add diagnostic header
  if (originalContentType) {
    h.set("content-type", originalContentType);
  }

  return new Response(resp.body, { status: resp.status, headers: h });
}

// Enhanced compression helper with better encoding detection
function smartCompress(
  body: Uint8Array,
  req: Request,
  contentType: string,
): { stream: ReadableStream | Uint8Array; encoding?: string } {
  const accept = req.headers.get("accept-encoding")?.toLowerCase() ?? "";
  
  // Skip compression for HTML if disabled
  if (DISABLE_HTML_COMPRESSION && contentType.startsWith("text/html")) {
    console.log("[miniapp] HTML compression disabled");
    return { stream: body };
  }

  // Only compress html and json responses
  const compressible = contentType.startsWith("text/html") ||
    contentType.startsWith("application/json");
  if (!compressible || !accept) return { stream: body };

  // Parse encodings and respect quality values
  const encodings = accept.split(",")
    .map((e) => {
      const [name, q = "q=1"] = e.trim().split(";");
      const quality = parseFloat(q.split("=")[1] || "1");
      return { name: name.trim(), quality };
    })
    .filter(e => e.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  console.log(`[miniapp] Accept-Encoding: ${accept}, parsed:`, encodings.map(e => `${e.name}(${e.quality})`).join(", "));

  for (const { name } of encodings) {
    if (name === "br" || name === "gzip") {
      try {
        const stream = new Blob([body]).stream().pipeThrough(
          new CompressionStream(name),
        );
        console.log(`[miniapp] Using compression: ${name}`);
        return { stream, encoding: name };
      } catch (e) {
        console.warn(`[miniapp] Compression ${name} failed:`, e);
      }
    }
  }

  console.log("[miniapp] No compression used");
  return { stream: body };
}

// Storage fetching helper
async function fetchFromStorage(key: string): Promise<Uint8Array | null> {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) {
      console.warn(`[miniapp] Storage fetch failed for ${key}:`, error);
      return null;
    }
    console.log(`[miniapp] Successfully fetched ${key} from storage`);
    return new Uint8Array(await data.arrayBuffer());
  } catch (e) {
    console.error(`[miniapp] Storage fetch error for ${key}:`, e);
    return null;
  }
}

// Serve static files from the built React app with fallback
async function serveStaticIndex(): Promise<Response | null> {
      try {
        const staticIndexPath = new URL("./static/index.html", import.meta.url);
        const htmlContent = await Deno.readTextFile(staticIndexPath);
        console.log(`[miniapp] Serving static index.html (${htmlContent.length} bytes)`);
        return new Response(htmlContent, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-cache",
            "x-served-from": "static"
          }
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
  <title>Dynamic Capital VIP • Mini App</title>
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
      <h1>Dynamic Capital VIP</h1>
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
  DISABLE_HTML_COMPRESSION
);

// API Routes Handler
async function handleApiRoutes(req: Request, path: string): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper function to get Telegram user ID from initData
  function extractTelegramUserId(initData: string): string {
    try {
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id?.toString() || '';
      }
    } catch (error) {
      console.warn('Failed to parse telegram user ID:', error);
    }
    return '';
  }

  // POST /api/admin-check - Check admin status
  if (path === "/api/admin-check" && req.method === "POST") {
    try {
      const body = await req.json();
      const telegram_user_id = body.telegram_user_id;
      
      if (!telegram_user_id) {
        return new Response(JSON.stringify({ error: "telegram_user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Check admin status in database
      const { data: user, error } = await supabase
        .from('bot_users')
        .select('is_admin')
        .eq('telegram_id', telegram_user_id)
        .single();

      if (error) {
        console.error('Admin check error:', error);
        return new Response(JSON.stringify({ is_admin: false }), {
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        is_admin: user?.is_admin || false,
        telegram_user_id 
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      console.error('Admin check error:', error);
      return new Response(JSON.stringify({ is_admin: false }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // POST /api/subscription-status - Get subscription status
  if (path === "/api/subscription-status" && req.method === "POST") {
    try {
      const body = await req.json();
      const telegram_user_id = body.telegram_user_id;
      
      if (!telegram_user_id) {
        return new Response(JSON.stringify({ error: "telegram_user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Get user subscription status
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_user_subscription_status', { telegram_user_id });

      if (statusError) {
        console.error('Subscription status error:', statusError);
        return new Response(JSON.stringify({ 
          subscription: null,
          available_plans: []
        }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Get available plans
      const { data: plans, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      return new Response(JSON.stringify({ 
        subscription: statusData?.[0] || null,
        available_plans: plans || []
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      console.error('Subscription status error:', error);
      return new Response(JSON.stringify({ 
        subscription: null,
        available_plans: []
      }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // POST /api/sync-user - Sync Telegram user with database
  if (path === "/api/sync-user" && req.method === "POST") {
    try {
      const body = await req.json();
      const { initData } = body;
      
      if (!initData) {
        return new Response(JSON.stringify({ error: "initData required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      const telegram_user_id = extractTelegramUserId(initData);
      if (!telegram_user_id) {
        return new Response(JSON.stringify({ error: "Invalid initData" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Parse user data from initData
      const params = new URLSearchParams(initData);
      const userStr = params.get('user');
      let userData = null;
      if (userStr) {
        userData = JSON.parse(userStr);
      }

      // Upsert user in bot_users table
      const { data: user, error } = await supabase
        .from('bot_users')
        .upsert({
          telegram_id: telegram_user_id,
          first_name: userData?.first_name || null,
          last_name: userData?.last_name || null,
          username: userData?.username || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'telegram_id'
        })
        .select()
        .single();

      if (error) {
        console.error('User sync error:', error);
        return new Response(JSON.stringify({ error: "Failed to sync user" }), {
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ 
        ok: true,
        user: {
          telegram_id: user.telegram_id,
          is_admin: user.is_admin,
          is_vip: user.is_vip
        }
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      console.error('User sync error:', error);
      return new Response(JSON.stringify({ error: "Failed to sync user" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // GET /api/vip-dashboard - Get VIP dashboard data
  if (path === "/api/vip-dashboard" && req.method === "GET") {
    try {
      const url = new URL(req.url);
      const telegram_user_id = url.searchParams.get('telegram_user_id');
      
      if (!telegram_user_id) {
        return new Response(JSON.stringify({ error: "telegram_user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Check if user is VIP
      const { data: user, error: userError } = await supabase
        .from('bot_users')
        .select('is_vip, subscription_expires_at')
        .eq('telegram_id', telegram_user_id)
        .single();

      if (userError || !user?.is_vip) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Get VIP analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('daily_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      // Get recent interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('telegram_user_id', telegram_user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      return new Response(JSON.stringify({ 
        user: {
          is_vip: user.is_vip,
          subscription_expires_at: user.subscription_expires_at
        },
        analytics: analytics || [],
        recent_interactions: interactions || []
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      console.error('VIP dashboard error:', error);
      return new Response(JSON.stringify({ error: "Failed to load dashboard" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // POST /api/receipt - Receipt upload
  if (path === "/api/receipt" && req.method === "POST") {
    try {
      const form = await req.formData();
      const initData = String(form.get("initData") || "");
      const file = form.get("image");
      
      if (!(file instanceof File)) {
        return new Response(JSON.stringify({ error: "image required" }), { 
          status: 400,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Verify initData (simple implementation)
      if (!initData) {
        return new Response(JSON.stringify({ error: "initData required" }), { 
          status: 401,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }

      // Generate storage path
      const ext = file.name.split(".").pop();
      const userId = "temp"; // In real implementation, extract from initData
      const path = `receipts/${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      
      // Upload to storage
      try {
        await supabase.storage.from("payment-receipts").upload(path, file);
        
        return new Response(JSON.stringify({ 
          ok: true, 
          bucket: "payment-receipts", 
          path 
        }), { 
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      } catch (uploadError) {
        console.error("Upload error:", uploadError);
        return new Response(JSON.stringify({ 
          error: "Failed to upload receipt" 
        }), { 
          status: 500,
          headers: { ...corsHeaders, "content-type": "application/json" }
        });
      }
    } catch (error) {
      console.error("Receipt upload error:", error);
      return new Response(JSON.stringify({ 
        error: "Failed to submit receipt. Please try again later." 
      }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // GET /api/receipts - Get receipts
  if (path.startsWith("/api/receipts") && req.method === "GET") {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const status = url.searchParams.get("status");
    
    // Mock response for now
    const receipts = [];
    return new Response(JSON.stringify({ receipts }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }

  // POST /api/receipt/:id/approve - Approve receipt
  const approveMatch = path.match(/^\/api\/receipt\/([^/]+)\/approve$/);
  if (approveMatch && req.method === "POST") {
    const id = approveMatch[1];
    // Mock approval
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }

  // POST /api/receipt/:id/reject - Reject receipt
  const rejectMatch = path.match(/^\/api\/receipt\/([^/]+)\/reject$/);
  if (rejectMatch && req.method === "POST") {
    const id = rejectMatch[1];
    // Mock rejection
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" }
    });
  }

  // POST /api/intent - Create payment intent
  if (path === "/api/intent" && req.method === "POST") {
    try {
      const body = await req.json();
      const payCode = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      return new Response(JSON.stringify({ 
        ok: true, 
        pay_code: payCode,
        type: body.type || "bank"
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Failed to create payment intent" 
      }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // POST /api/crypto-txid - Submit crypto transaction
  if (path === "/api/crypto-txid" && req.method === "POST") {
    try {
      const body = await req.json();
      
      return new Response(JSON.stringify({ 
        ok: true, 
        txid: body.txid 
      }), {
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Failed to submit transaction" 
      }), { 
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" }
      });
    }
  }

  // API route not found
  return new Response(JSON.stringify({ error: "API endpoint not found" }), { 
    status: 404,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  url.pathname = url.pathname.replace(/^\/functions\/v1/, "");
  const path = url.pathname;

  console.log(`[miniapp] ${req.method} ${path}`);
  
  // Handle version endpoint for health checks and deployment verification
  if (path === "/version" || path === "/miniapp/version") {
    return withSecurity(new Response(JSON.stringify({
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      healthy: true,
      deployment_id: Deno.env.get("DENO_DEPLOYMENT_ID") || "unknown"
    }), {
      headers: { "content-type": "application/json" }
    }));
  }

  // Try to use the static server helper for common routes
  if (path === "/" || path === "/miniapp" || path === "/miniapp/" || path.startsWith("/assets/")) {
    try {
      const staticOpts: StaticOpts = {
        rootDir: new URL("./static/", import.meta.url),
        spaRoots: ["/", "/miniapp", "/miniapp/"],
        security: ENHANCED_SECURITY_HEADERS,
        extraFiles: ["/favicon.ico", "/favicon.svg", "/vite.svg", "/robots.txt"]
      };
      
      // Try static serving first
      const staticResponse = await serveStatic(req, staticOpts);
      
      // If static serving succeeds, add diagnostic header and return
      if (staticResponse.status === 200) {
        const headers = new Headers(staticResponse.headers);
        headers.set("x-served-from", "static");
        console.log(`[miniapp] Served ${path} from static build`);
        return new Response(staticResponse.body, { 
          status: staticResponse.status, 
          headers 
        });
      }
    } catch (e) {
      console.warn(`[miniapp] Static serving failed for ${path}:`, e.message);
    }
  }

  // HEAD routes
  if (req.method === "HEAD") {
    if (path === "/" || path === "/miniapp" || path === "/miniapp/") {
      return withSecurity(new Response(null, { 
        status: 200, 
        headers: { 
          "content-type": "text/html; charset=utf-8",
          "x-served-from": "head-check"
        } 
      }));
    }
    if (path === "/miniapp/version") {
      return withSecurity(new Response(null, { 
        status: 200,
        headers: { 
          "content-type": "application/json; charset=utf-8",
          "x-served-from": "head-check"
        }
      }));
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
      const arr = await fetchFromStorage(INDEX_KEY);
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
          return withSecurity(new Response(staticResp.body, { 
            status: staticResp.status, 
            headers 
          }));
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
        return withSecurity(new Response(staticResp.body, { 
          status: staticResp.status, 
          headers 
        }));
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

    console.log(`[miniapp] Serving index.html (${arr.length} bytes) with headers:`, headers);
    const resp = new Response(stream, { status: 200, headers });
    return withSecurity(resp);
  }

  // GET /miniapp/version
  if (path === "/miniapp/version") {
    const versionData = { 
      name: "miniapp", 
      ts: new Date().toISOString(),
      serveFromStorage: SERVE_FROM_STORAGE,
      htmlCompressionDisabled: DISABLE_HTML_COMPRESSION
    };
    
    const body = new TextEncoder().encode(JSON.stringify(versionData));
    const contentType = "application/json; charset=utf-8";
    const { stream, encoding } = smartCompress(body, req, contentType);
    
    const headers: Record<string, string> = { 
      "content-type": contentType,
      "x-served-from": "version-endpoint"
    };
    if (encoding) headers["content-encoding"] = encoding;
    
    const resp = new Response(stream, { status: 200, headers });
    console.log(`[miniapp] Served version endpoint`);
    return withSecurity(resp);
  }

  // GET /assets/* → serve from static build or storage
  if (path.startsWith("/assets/")) {
    const assetPath = path.slice("/assets/".length);
    let arr: Uint8Array | null = null;
    let servedFrom: string;

    // Try static build first
    try {
      const staticAssetPath = new URL(`./static/assets/${assetPath}`, import.meta.url);
      arr = await Deno.readFile(staticAssetPath);
      servedFrom = "static";
      console.log(`[miniapp] Served asset ${assetPath} from static build`);
    } catch {
      // Fallback to storage
      arr = await fetchFromStorage(`assets/${assetPath}`);
      if (arr) {
        servedFrom = "storage";
        console.log(`[miniapp] Served asset ${assetPath} from storage`);
      } else {
        console.warn(`[miniapp] Asset ${assetPath} not found in static or storage`);
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
      if (assetPath.endsWith(".jpg") || assetPath.endsWith(".jpeg")) return "image/jpeg";
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
  if (path.startsWith("/api/")) {
    return handleApiRoutes(req, path);
  }

  // Unknown path → 404
  console.log(`[miniapp] Path not found: ${path}`);
  return withSecurity(nf("Not Found"));
}

if (import.meta.main) {
  Deno.serve(handler);
}

export default handler;
