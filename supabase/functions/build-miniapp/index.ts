import { createSupabaseClient } from "../_shared/client.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);

    console.log("Building coming soon page for miniapp...");

    // Create the coming soon HTML content
    const comingSoonHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Dynamic Capital Mini App - Coming Soon</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      margin: 0; padding: 1rem;
      background: var(--tg-theme-bg-color);
      color: var(--tg-theme-text-color);
      min-height: 100vh;
    }
    #app { max-width: 400px; margin: 0 auto; }
    .card {
      background: var(--tg-theme-secondary-bg-color);
      border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .coming-soon { text-align: center; }
    h1 {
      margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 600;
      color: var(--tg-theme-text-color);
    }
    .muted {
      color: var(--tg-theme-hint-color);
      font-size: 0.9rem; line-height: 1.4;
    }
  </style>
</head>
<body>
  <div id="app">
    <div class="card coming-soon">
      <h1>Dynamic Capital</h1>
      <p class="muted">Our mini app is coming soon. Stay tuned!</p>
    </div>
  </div>
  <script>
    const tg = window.Telegram?.WebApp;
    if (tg) tg.ready();
  </script>
</body>
</html>`;

    // Upload the HTML to storage
    const { error: uploadError } = await supabase.storage
      .from('miniapp')
      .upload(
        'index.html',
        new Blob([comingSoonHTML], { type: 'text/html; charset=utf-8' }),
        {
          upsert: true,
          contentType: 'text/html; charset=utf-8',
        },
      );

    if (uploadError) {
      throw uploadError;
    }

    console.log("Coming soon page deployed successfully");
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Coming soon page deployed successfully",
      buildOutput: "✅ Coming soon HTML generated",
      syncOutput: "✅ Uploaded to miniapp storage bucket"
    }), {
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    console.error("Deploy process error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }
    });
  }
}

// Handle CORS preflight requests
if (import.meta.main) {
  Deno.serve((req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    return handler(req);
  });
}

export default handler;