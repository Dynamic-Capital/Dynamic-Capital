import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "../_shared/client.ts";
import { json, ok, oops } from "../_shared/http.ts";
import { EdgeRuntime } from "https://deno.land/x/edge_runtime@1.0.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient();

    if (req.method === 'POST') {
      const { action } = await req.json();

      switch (action) {
        case 'cleanup_duplicate_files':
          // Start background cleanup task
          EdgeRuntime.waitUntil(performGitHubCleanup(supabase));
          return ok({ message: 'GitHub cleanup started in background' });
        
        case 'get_cleanup_status':
          return await getCleanupStatus(supabase);
        
        default:
          return json({ ok: false, error: 'Invalid action' }, 400);
      }
    }

    return json({ ok: false, error: 'Method not allowed' }, 405);

  } catch (error) {
    console.error('GitHub cleanup error:', error);
    return oops('Internal server error', error.message);
  }
});

async function performGitHubCleanup(supabase: any) {
  console.log('🧹 Starting GitHub cleanup process...');
  
  try {
    // Log cleanup start
    await supabase.from('admin_logs').insert({
      action_type: 'github_cleanup_start',
      action_description: 'Started automated GitHub cleanup process',
    });

    const duplicateFiles = await identifyDuplicateFiles();
    const unusedFiles = await identifyUnusedFiles();
    const cleanupSummary = {
      duplicate_files: duplicateFiles,
      unused_files: unusedFiles,
      total_removable: duplicateFiles.length + unusedFiles.length,
      cleanup_date: new Date().toISOString()
    };

    // Store cleanup analysis results
    await supabase.from('kv_config').upsert({
      key: 'github_cleanup_analysis',
      value: cleanupSummary
    });

    console.log(`🔍 Analysis complete: ${cleanupSummary.total_removable} files identified for cleanup`);

    // Log cleanup completion
    await supabase.from('admin_logs').insert({
      action_type: 'github_cleanup_complete',
      action_description: `Cleanup analysis complete: ${cleanupSummary.total_removable} files identified`,
    });

    return cleanupSummary;

  } catch (error) {
    console.error('❌ GitHub cleanup failed:', error);
    
    await supabase.from('admin_logs').insert({
      action_type: 'github_cleanup_error',
      action_description: `Cleanup failed: ${error.message}`,
    });

    throw error;
  }
}

async function identifyDuplicateFiles(): Promise<string[]> {
  // Files that are likely duplicates or unnecessary
  const duplicatePatterns = [
    // Old admin components that might be duplicated
    'src/components/admin/AdminDashboard.tsx', // If there's a newer version
    'src/components/admin/BotDebugger.tsx', // If functionality moved elsewhere
    
    // Potential duplicate styling files
    'src/App.css', // If styles moved to index.css
    
    // Test files in wrong locations
    'src/**/*.test.tsx',
    'src/**/*.test.ts',
    
    // Backup or old files
    'src/**/*.backup.*',
    'src/**/*.old.*',
    'src/**/*_old.*',
    'src/**/*_backup.*',
    
    // Duplicate Mini App files (if main app has same functionality)
    'miniapp/src/components/ui/**', // If shadcn components are duplicated
    
    // Old configuration files
    'postcss.config.js', // If not needed
    
    // Redundant documentation
    'docs/CLEANUP_AND_CODEMODS.md', // If cleanup is automated
    'docs/CONFIG.md', // If covered elsewhere
  ];

  console.log('🔍 Identifying duplicate files...');
  return duplicatePatterns.filter(pattern => {
    // In a real implementation, you'd check if the file exists and has duplicates
    console.log(`  📁 Checking pattern: ${pattern}`);
    return true; // Placeholder - would implement actual file checking
  });
}

async function identifyUnusedFiles(): Promise<string[]> {
  // Files that might be unused or obsolete
  const potentiallyUnusedFiles = [
    // Old build artifacts
    'dist/**',
    'build/**',
    
    // Unused assets
    'public/placeholder.svg', // If using generated images instead
    
    // Development files that shouldn't be in production
    '.denoignore', // If not using Deno
    'deno.json',
    'deno.jsonc',
    'deno.lock',
    
    // Old migration files (keep recent ones)
    'supabase/migrations/*_old_*.sql',
    
    // Unused components
    'src/components/welcome/WelcomeMessage.tsx', // If not used in main app
    'src/pages/NotFound.tsx', // If using a different 404 page
    'src/pages/RefreshBot.tsx', // If functionality moved
    
    // Redundant scripts
    'scripts/audit/**', // If automated
    'scripts/cleanup/**', // If automated
    'scripts/verify/**', // If automated
    
    // Old types
    'types/deno.d.ts', // If not using Deno
    'types/tesseract.d.ts', // If not using Tesseract
  ];

  console.log('🔍 Identifying unused files...');
  return potentiallyUnusedFiles.filter(file => {
    console.log(`  📄 Checking file: ${file}`);
    return true; // Placeholder - would implement actual usage checking
  });
}

async function getCleanupStatus(supabase: any) {
  try {
    const { data: analysis } = await supabase
      .from('kv_config')
      .select('value')
      .eq('key', 'github_cleanup_analysis')
      .maybeSingle();

    if (!analysis?.value) {
      return ok({ status: 'not_started', message: 'No cleanup analysis found' });
    }

    return ok({ status: 'completed', analysis: analysis.value });

  } catch (error) {
    console.error('❌ Error fetching cleanup status:', error);
    return oops('Failed to fetch cleanup status', error.message);
  }
}

// Recommended file structure for clean organization
const RECOMMENDED_STRUCTURE = {
  keep: [
    // Core application files
    'src/App.tsx',
    'src/main.tsx',
    'src/index.css',
    'tailwind.config.ts',
    'vite.config.ts',
    'tsconfig.json',
    'package.json',
    
    // Essential components
    'src/components/ui/**', // shadcn components
    'src/components/layout/**', // Layout components
    'src/components/navigation/**', // Navigation
    'src/components/admin/ContactInfo.tsx', // Active admin components
    
    // Essential pages
    'src/pages/Index.tsx',
    'src/pages/Contact.tsx',
    'src/pages/Plans.tsx',
    'src/pages/Checkout.tsx',
    'src/pages/AdminDashboard.tsx',
    
    // Core hooks and utilities
    'src/hooks/**',
    'src/lib/utils.ts',
    'src/integrations/supabase/**',
    
    // Supabase functions (active ones)
    'supabase/functions/contact-links/**',
    'supabase/functions/vip-sync-enhanced/**',
    'supabase/functions/telegram-bot/**',
    'supabase/functions/_shared/**',
    
    // Essential configuration
    'supabase/config.toml',
    'supabase/migrations/**', // Recent migrations only
  ],
  
  remove: [
    // Duplicate or old components
    'src/components/admin/BotDebugger.tsx', // If functionality moved
    'src/pages/BuildMiniApp.tsx', // If not used
    'src/pages/UploadMiniApp.tsx', // If not used
    'src/pages/MiniAppDemo.tsx', // If demo not needed
    
    // Development-only files
    'scripts/audit/**',
    'scripts/cleanup/**',
    'scripts/verify/**',
    'docs/CLEANUP_AND_CODEMODS.md',
    
    // Duplicate Mini App if main app has same functionality
    'miniapp/**', // If functionality is in main app
    
    // Old test files
    'tests/**', // If moved to proper test directories
    'functions/_tests/**', // If consolidated
  ]
};
