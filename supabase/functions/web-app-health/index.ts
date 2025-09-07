import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { version } from "../_shared/version.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export async function handler(req: Request): Promise<Response> {
  const v = version(req, "web-app-health");
  if (v) return v;
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }), 
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  const supa = createClient("anon");
  const healthChecks: Record<string, any> = {};

  try {
    // Check database connectivity
    const startTime = Date.now();
    
    // Test subscription plans
    const { data: plans, error: plansError } = await supa
      .from("subscription_plans")
      .select("id")
      .limit(1);
    
    healthChecks.database = {
      status: plansError ? "error" : "ok",
      error: plansError?.message,
      response_time: Date.now() - startTime
    };

    // Test bot content
    const contentStart = Date.now();
    const { data: content, error: contentError } = await supa
      .from("bot_content")
      .select("content_key")
      .eq("is_active", true)
      .limit(1);
    
    healthChecks.bot_content = {
      status: contentError ? "error" : "ok",
      error: contentError?.message,
      response_time: Date.now() - contentStart
    };

    // Test promotions
    const promoStart = Date.now();
    const { data: promos, error: promoError } = await supa
      .from("promotions")
      .select("code")
      .eq("is_active", true)
      .limit(1);
    
    healthChecks.promotions = {
      status: promoError ? "error" : "ok",
      error: promoError?.message,
      response_time: Date.now() - promoStart,
      active_count: promos?.length || 0
    };

    // Test RPC functions
    const rpcStart = Date.now();
    try {
      const { data: rpcTest, error: rpcError } = await supa
        .rpc('validate_promo_code', { 
          p_code: 'HEALTH_CHECK', 
          p_telegram_user_id: 'health_check_user' 
        });
      
      healthChecks.rpc_functions = {
        status: rpcError ? "error" : "ok",
        error: rpcError?.message,
        response_time: Date.now() - rpcStart
      };
    } catch (rpcErr) {
      healthChecks.rpc_functions = {
        status: "error",
        error: "RPC function test failed",
        response_time: Date.now() - rpcStart
      };
    }

    // Overall health assessment
    const allChecks = Object.values(healthChecks);
    const hasErrors = allChecks.some((check: any) => check.status === "error");
    const avgResponseTime = allChecks.reduce((sum: number, check: any) => sum + (check.response_time || 0), 0) / allChecks.length;

    const healthStatus = {
      overall_status: hasErrors ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      checks: healthChecks,
      performance: {
        average_response_time: Math.round(avgResponseTime),
        total_checks: allChecks.length,
        failed_checks: allChecks.filter((check: any) => check.status === "error").length
      },
      recommendations: []
    };

    // Add recommendations based on health
    if (hasErrors) {
      healthStatus.recommendations.push("Some database operations are failing. Check network connectivity and database status.");
    }
    
    if (avgResponseTime > 1000) {
      healthStatus.recommendations.push("Database response time is high. Consider optimizing queries or checking network latency.");
    }

    return new Response(
      JSON.stringify(healthStatus), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        overall_status: "error",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
        details: error.message
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

if (import.meta.main) serve(handler);