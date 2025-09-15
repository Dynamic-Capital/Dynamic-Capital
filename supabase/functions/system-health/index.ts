import { createSupabaseClient } from "../_shared/client.ts";
import { registerHandler } from "../_shared/serve.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface SystemHealthCheck {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message?: string;
  response_time?: number;
  last_checked: string;
}

export const handler = registerHandler(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'GET') {
      return await performHealthCheck(supabase);
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in system-health:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performHealthCheck(supabase: any): Promise<Response> {
  const healthChecks: SystemHealthCheck[] = [];
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbStart = Date.now();
    const { error: dbError } = await supabase
      .from('bot_users')
      .select('count')
      .limit(1);
    
    healthChecks.push({
      component: 'database',
      status: dbError ? 'error' : 'healthy',
      message: dbError ? `Database error: ${dbError.message}` : 'Database connection successful',
      response_time: Date.now() - dbStart,
      last_checked: new Date().toISOString(),
    });

    // Check bot users table
    const userStart = Date.now();
    const { data: userCount, error: userError } = await supabase
      .from('bot_users')
      .select('id', { count: 'exact', head: true });
    
    healthChecks.push({
      component: 'bot_users_table',
      status: userError ? 'error' : 'healthy',
      message: userError ? `User table error: ${userError.message}` : `${userCount?.length || 0} users in system`,
      response_time: Date.now() - userStart,
      last_checked: new Date().toISOString(),
    });

    // Check subscriptions table
    const subStart = Date.now();
    const { data: activeSubscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('is_active', true)
      .limit(1);
    
    healthChecks.push({
      component: 'subscriptions',
      status: subError ? 'error' : 'healthy',
      message: subError ? `Subscription error: ${subError.message}` : 'Subscriptions table accessible',
      response_time: Date.now() - subStart,
      last_checked: new Date().toISOString(),
    });

    // Check payments table
    const payStart = Date.now();
    const { data: recentPayments, error: payError } = await supabase
      .from('payments')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    
    healthChecks.push({
      component: 'payments',
      status: payError ? 'error' : 'healthy',
      message: payError ? `Payments error: ${payError.message}` : 'Payments table accessible',
      response_time: Date.now() - payStart,
      last_checked: new Date().toISOString(),
    });

    // Check analytics table
    const analyticsStart = Date.now();
    const { error: analyticsError } = await supabase
      .from('user_analytics')
      .select('id')
      .limit(1);
    
    healthChecks.push({
      component: 'user_analytics',
      status: analyticsError ? 'error' : 'healthy',
      message: analyticsError ? `Analytics error: ${analyticsError.message}` : 'Analytics table accessible',
      response_time: Date.now() - analyticsStart,
      last_checked: new Date().toISOString(),
    });

    // Check storage bucket
    const storageStart = Date.now();
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    healthChecks.push({
      component: 'storage',
      status: storageError ? 'error' : 'healthy',
      message: storageError ? `Storage error: ${storageError.message}` : `${buckets?.length || 0} storage buckets available`,
      response_time: Date.now() - storageStart,
      last_checked: new Date().toISOString(),
    });

    // Check Telegram bot token (if available)
    const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (telegramToken) {
      const telegramStart = Date.now();
      try {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/getMe`);
        const telegramData = await telegramResponse.json();
        
        healthChecks.push({
          component: 'telegram_bot',
          status: telegramData.ok ? 'healthy' : 'error',
          message: telegramData.ok ? `Bot connected: @${telegramData.result.username}` : 'Telegram bot connection failed',
          response_time: Date.now() - telegramStart,
          last_checked: new Date().toISOString(),
        });
      } catch (telegramError) {
        healthChecks.push({
          component: 'telegram_bot',
          status: 'error',
          message: `Telegram API error: ${telegramError.message}`,
          response_time: Date.now() - telegramStart,
          last_checked: new Date().toISOString(),
        });
      }
    }

    // Calculate overall health
    const errorCount = healthChecks.filter(check => check.status === 'error').length;
    const warningCount = healthChecks.filter(check => check.status === 'warning').length;
    
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (errorCount > 0) {
      overallStatus = 'error';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    const totalResponseTime = Date.now() - startTime;

    const healthReport = {
      overall_status: overallStatus,
      total_checks: healthChecks.length,
      healthy_checks: healthChecks.filter(check => check.status === 'healthy').length,
      warning_checks: warningCount,
      error_checks: errorCount,
      total_response_time: totalResponseTime,
      checks: healthChecks,
      timestamp: new Date().toISOString(),
      system_info: {
        environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development',
        deno_version: Deno.version.deno,
        region: Deno.env.get('DENO_REGION') || 'unknown',
      },
    };

    const statusCode = overallStatus === 'error' ? 503 : 200;

    return new Response(
      JSON.stringify(healthReport),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorReport = {
      overall_status: 'error',
      total_checks: 0,
      healthy_checks: 0,
      warning_checks: 0,
      error_checks: 1,
      total_response_time: Date.now() - startTime,
      checks: [{
        component: 'health_check_system',
        status: 'error' as const,
        message: `Health check system failure: ${error.message}`,
        last_checked: new Date().toISOString(),
      }],
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(errorReport),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

export default handler;
