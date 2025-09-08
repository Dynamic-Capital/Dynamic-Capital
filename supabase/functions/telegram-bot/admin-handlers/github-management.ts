// GitHub Cleanup Management for Telegram Admin
import { supabaseAdmin, sendMessage } from "./common.ts";
import { logAdminAction } from "../database-utils.ts";

// Handle GitHub Cleanup Management
export async function handleGitHubCleanup(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `🧹 *GitHub Repository Cleanup*

📋 *Cleanup Options:*
• Remove duplicate files
• Clean up unused components  
• Organize file structure
• Remove development-only files

⚠️ **Important:** This will analyze and suggest files for removal. Always review before applying changes to production.

🎯 *Actions Available:*`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔍 Analyze Repository", callback_data: "github_analyze" },
        { text: "📊 View Cleanup Status", callback_data: "github_status" },
      ],
      [
        { text: "🗑️ Start Cleanup", callback_data: "github_cleanup_start" },
        { text: "📁 Recommended Structure", callback_data: "github_structure" },
      ],
      [
        { text: "🔙 Back", callback_data: "admin_dashboard" },
      ],
    ],
  };

  await sendMessage(chatId, message, keyboard);
}

// Analyze Repository
export async function handleGitHubAnalyze(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    await sendMessage(chatId, "🔍 Analyzing repository for duplicate and unused files...");

    const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/github-cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cleanup_duplicate_files' })
    });

    const result = await response.json();

    if (result.ok) {
      await logAdminAction(
        userId,
        "github_analyze",
        "Started GitHub repository analysis",
        "kv_config"
      );

      const message = `✅ *Repository Analysis Started*

🔄 Analysis is running in the background...

The system is identifying:
• Duplicate files and components
• Unused files and assets  
• Development-only files
• Potential cleanup opportunities

📊 Check status in a few moments for results.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📊 Check Status", callback_data: "github_status" },
            { text: "🔙 Back", callback_data: "github_cleanup" },
          ],
        ],
      };

      await sendMessage(chatId, message, keyboard);
    } else {
      throw new Error(result.error || 'Analysis failed');
    }

  } catch (error) {
    console.error("GitHub analysis error:", error);
    await sendMessage(chatId, `❌ Analysis failed: ${error.message}`);
  }
}

// View Cleanup Status
export async function handleGitHubStatus(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/github-cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_cleanup_status' })
    });

    const result = await response.json();

    if (result.ok) {
      if (result.status === 'not_started') {
        const message = `📋 *Cleanup Status*

🔍 No analysis has been run yet.

Start an analysis to identify duplicate and unused files.`;

        const keyboard = {
          inline_keyboard: [
            [
              { text: "🔍 Start Analysis", callback_data: "github_analyze" },
              { text: "🔙 Back", callback_data: "github_cleanup" },
            ],
          ],
        };

        await sendMessage(chatId, message, keyboard);
        return;
      }

      const analysis = result.analysis;
      const message = `📊 *Repository Analysis Results*

🗂️ **Files Identified for Cleanup:**
• Duplicate files: ${analysis.duplicate_files?.length || 0}
• Unused files: ${analysis.unused_files?.length || 0}
• **Total removable:** ${analysis.total_removable || 0}

📅 Analysis date: ${new Date(analysis.cleanup_date).toLocaleDateString()}

⚠️ **Review Required:** Please review the identified files before removing them.`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "📁 View File List", callback_data: "github_file_list" },
            { text: "🗑️ Proceed with Cleanup", callback_data: "github_cleanup_confirm" },
          ],
          [
            { text: "🔄 Re-analyze", callback_data: "github_analyze" },
            { text: "🔙 Back", callback_data: "github_cleanup" },
          ],
        ],
      };

      await sendMessage(chatId, message, keyboard);
    } else {
      throw new Error(result.error || 'Failed to fetch status');
    }

  } catch (error) {
    console.error("GitHub status error:", error);
    await sendMessage(chatId, `❌ Failed to fetch status: ${error.message}`);
  }
}

// Show Recommended Structure
export async function handleGitHubStructure(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `📁 *Recommended File Structure*

✅ **Keep These Files:**
📂 **Core Application**
\`\`\`
src/
├── App.tsx
├── main.tsx
├── index.css
├── components/
│   ├── ui/ (shadcn)
│   ├── layout/
│   ├── navigation/
│   └── admin/ContactInfo.tsx
├── pages/
│   ├── Index.tsx
│   ├── Contact.tsx
│   ├── Plans.tsx
│   └── Checkout.tsx
├── hooks/
├── lib/utils.ts
└── integrations/supabase/
\`\`\`

📂 **Supabase Functions**
\`\`\`
supabase/
├── functions/
│   ├── contact-links/
│   ├── vip-sync-enhanced/
│   ├── telegram-bot/
│   └── _shared/
├── config.toml
└── migrations/ (recent only)
\`\`\`

❌ **Remove These Files:**
• Old/duplicate components
• Development scripts
• Unused test files
• Demo/example files
• Backup files

🎯 This structure focuses on functional, actively used files only.`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "🔍 Analyze Current", callback_data: "github_analyze" },
        { text: "🔙 Back", callback_data: "github_cleanup" },
      ],
    ],
  };

  await sendMessage(chatId, message, keyboard);
}

// Confirm Cleanup
export async function handleGitHubCleanupConfirm(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `⚠️ **GitHub Cleanup Confirmation**

**IMPORTANT:** This action will remove files from your repository.

🔍 **What will happen:**
• Duplicate files will be identified and marked for removal
• Unused components will be flagged  
• Development-only files will be cleaned up
• A backup recommendation list will be provided

📋 **Recommended Steps:**
1. Create a backup branch first
2. Review the file list carefully
3. Test the application after cleanup
4. Ensure all functionality remains intact

❌ **This action cannot be easily undone**

Are you absolutely sure you want to proceed?`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: "⚠️ Yes, Proceed with Cleanup", callback_data: "github_cleanup_execute" },
      ],
      [
        { text: "❌ Cancel", callback_data: "github_cleanup" },
      ],
    ],
  };

  await sendMessage(chatId, message, keyboard);
}

// Execute Cleanup (Placeholder - would need GitHub API integration)
export async function handleGitHubCleanupExecute(
  chatId: number,
  userId: string,
): Promise<void> {
  const message = `🚧 *GitHub Cleanup*

⚠️ **Manual Action Required**

For security reasons, the actual file removal must be done manually.

📋 **Recommended Cleanup Steps:**

1️⃣ **Create Backup Branch:**
\`\`\`
git checkout -b backup-before-cleanup
git push origin backup-before-cleanup
\`\`\`

2️⃣ **Remove Duplicate Files:**
• Delete old admin components if newer versions exist
• Remove duplicate styling files
• Clean up test files in wrong locations

3️⃣ **Remove Unused Files:**
• Delete development scripts (scripts/audit/, scripts/cleanup/)
• Remove unused documentation
• Clean up old migration files
• Remove demo/example components

4️⃣ **Consolidate MiniApp:**
• If main app has same functionality, remove supabase/functions/miniapp/ directory
• Keep only active, functional components

5️⃣ **Test Application:**
• Verify all functionality works
• Check that builds complete successfully
• Test admin features

📊 Use the analysis results to guide which specific files to remove.`;

  await logAdminAction(
    userId,
    "github_cleanup_manual",
    "Provided manual cleanup instructions",
    "admin_logs"
  );

  const keyboard = {
    inline_keyboard: [
      [
        { text: "📊 View Analysis Again", callback_data: "github_status" },
        { text: "🔙 Back", callback_data: "github_cleanup" },
      ],
    ],
  };

  await sendMessage(chatId, message, keyboard);
}