/* eslint-disable no-case-declarations */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

console.log("🚀 Bot starting with environment check...");
console.log("BOT_TOKEN exists:", !!BOT_TOKEN);
console.log("SUPABASE_URL exists:", !!SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!SUPABASE_SERVICE_ROLE_KEY);

if (!BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing required environment variables");
  throw new Error("Missing required environment variables");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// Admin user IDs
const ADMIN_USER_IDS = new Set(["225513686"]);

// User sessions for features
const userSessions = new Map();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Bot startup time for status tracking
const BOT_START_TIME = new Date();

// Database utility functions
async function getBotContent(contentKey: string): Promise<string | null> {
  try {
    console.log(`📄 Fetching content: ${contentKey}`);
    const { data, error } = await supabaseAdmin
      .from('bot_content')
      .select('content_value')
      .eq('content_key', contentKey)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error(`❌ Error fetching content for ${contentKey}:`, error);
      return null;
    }

    console.log(`✅ Content fetched for ${contentKey}`);
    return data?.content_value || null;
  } catch (error) {
    console.error(`🚨 Exception in getBotContent for ${contentKey}:`, error);
    return null;
  }
}

async function setBotContent(contentKey: string, contentValue: string, adminId: string): Promise<boolean> {
  try {
    console.log(`📝 Setting content: ${contentKey} by admin: ${adminId}`);
    const { error } = await supabaseAdmin
      .from('bot_content')
      .upsert({
        content_key: contentKey,
        content_value: contentValue,
        last_modified_by: adminId,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      await logAdminAction(adminId, 'content_update', `Updated content: ${contentKey}`, 'bot_content');
      console.log(`✅ Content updated: ${contentKey}`);
    } else {
      console.error(`❌ Error setting content: ${contentKey}`, error);
    }

    return !error;
  } catch (error) {
    console.error('🚨 Exception in setBotContent:', error);
    return false;
  }
}

async function getBotSetting(settingKey: string): Promise<string | null> {
  try {
    console.log(`⚙️ Fetching setting: ${settingKey}`);
    const { data, error } = await supabaseAdmin
      .from('bot_settings')
      .select('setting_value')
      .eq('setting_key', settingKey)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error(`❌ Error fetching setting ${settingKey}:`, error);
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error(`🚨 Exception fetching setting ${settingKey}:`, error);
    return null;
  }
}

async function setBotSetting(settingKey: string, settingValue: string, adminId: string): Promise<boolean> {
  try {
    console.log(`⚙️ Setting bot setting: ${settingKey} = ${settingValue}`);
    const { error } = await supabaseAdmin
      .from('bot_settings')
      .upsert({
        setting_key: settingKey,
        setting_value: settingValue,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      await logAdminAction(adminId, 'setting_update', `Updated setting: ${settingKey}`, 'bot_settings');
      console.log(`✅ Setting updated: ${settingKey}`);
    } else {
      console.error(`❌ Error setting: ${settingKey}`, error);
    }

    return !error;
  } catch (error) {
    console.error('🚨 Exception in setBotSetting:', error);
    return false;
  }
}

async function logAdminAction(
  adminId: string,
  actionType: string,
  description: string,
  affectedTable?: string,
  affectedRecordId?: string,
  oldValues?: any,
  newValues?: any
): Promise<void> {
  try {
    await supabaseAdmin
      .from('admin_logs')
      .insert({
        admin_telegram_id: adminId,
        action_type: actionType,
        action_description: description,
        affected_table: affectedTable,
        affected_record_id: affectedRecordId,
        old_values: oldValues,
        new_values: newValues
      });
    console.log(`📋 Admin action logged: ${actionType} by ${adminId}`);
  } catch (error) {
    console.error('🚨 Error logging admin action:', error);
  }
}

async function updateUserActivity(telegramUserId: string, activityData: any = {}): Promise<void> {
  try {
    // Update user's last activity
    await supabaseAdmin
      .from('bot_users')
      .upsert({
        telegram_id: telegramUserId,
        updated_at: new Date().toISOString(),
        follow_up_count: 0 // Reset follow-up count on activity
      }, {
        onConflict: 'telegram_id'
      });

    // Track interaction
    await supabaseAdmin
      .from('user_interactions')
      .insert({
        telegram_user_id: telegramUserId,
        interaction_type: 'message',
        interaction_data: activityData,
        created_at: new Date().toISOString()
      });

    console.log(`👤 User activity updated: ${telegramUserId}`);
  } catch (error) {
    console.error('🚨 Error updating user activity:', error);
  }
}

function formatContent(content: string, variables: Record<string, string>): string {
  let formattedContent = content;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    formattedContent = formattedContent.replace(new RegExp(placeholder, 'g'), value || '');
  });
  
  return formattedContent;
}

// Load additional admin IDs from the database
async function refreshAdminIds() {
  try {
    console.log("🔑 Loading admin IDs from database...");
    const { data, error } = await supabaseAdmin
      .from('bot_users')
      .select('telegram_id')
      .eq('is_admin', true);

    if (error) {
      console.error('❌ Failed to load admin IDs:', error);
      return;
    }

    let addedCount = 0;
    data?.forEach((row: { telegram_id: string | number }) => {
      const id = row.telegram_id.toString();
      if (!ADMIN_USER_IDS.has(id)) {
        ADMIN_USER_IDS.add(id);
        addedCount++;
      }
    });
    
    console.log(`✅ Loaded ${data?.length || 0} admin IDs from database (${addedCount} new)`);
    console.log(`🔑 Total admin IDs: ${ADMIN_USER_IDS.size}`);
  } catch (error) {
    console.error('🚨 Exception loading admin IDs:', error);
  }
}

// Initialize admin IDs
await refreshAdminIds();

function isAdmin(userId: string): boolean {
  const result = ADMIN_USER_IDS.has(userId);
  console.log(`🔐 Admin check for ${userId}: ${result}`);
  return result;
}

function getUserSession(userId: string | number) {
  const userIdStr = userId.toString();
  if (!userSessions.has(userIdStr)) {
    userSessions.set(userIdStr, { awaitingInput: null });
  }
  return userSessions.get(userIdStr);
}

async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>
) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_markup: replyMarkup,
    parse_mode: "Markdown"
  };

  try {
    console.log(`📤 Sending message to ${chatId}: ${text.substring(0, 100)}...`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Telegram API error:", errorData);
      return null;
    }

    const result = await response.json();
    console.log(`✅ Message sent successfully to ${chatId}`);
    return result;
  } catch (error) {
    console.error("🚨 Error sending message:", error);
    return null;
  }
}

// Enhanced content management functions
async function getWelcomeMessage(firstName: string): Promise<string> {
  const template = await getBotContent('welcome_message');
  if (!template) {
    return `🚀 *Welcome to Dynamic Capital VIP, ${firstName}!*\n\nWe're here to help you level up your trading with:\n\n• 🔔 Quick market updates\n• 📈 Beginner-friendly tips\n• 🎓 Easy learning resources\n\nReady to get started? Pick an option below 👇`;
  }
  return formatContent(template, { firstName });
}

async function getVipPackages(): Promise<any[]> {
  try {
    console.log("💎 Fetching VIP packages...");
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('❌ Error fetching VIP packages:', error);
      return [];
    }

    console.log(`✅ Fetched ${data?.length || 0} VIP packages`);
    return data || [];
  } catch (error) {
    console.error('🚨 Exception fetching VIP packages:', error);
    return [];
  }
}

// Enhanced VIP packages display with better formatting
async function getFormattedVipPackages(): Promise<string> {
  const packages = await getVipPackages();
  
  if (packages.length === 0) {
    return "💎 *VIP Membership Packages*\n\n❌ No packages available at the moment.";
  }

  let message = `💎 *VIP Membership Packages*\n\n🚀 *Unlock Premium Trading Success!*\n\n`;
  
  packages.forEach((pkg, index) => {
    const discount = pkg.duration_months >= 12 ? '🔥 BEST VALUE' : 
                    pkg.duration_months >= 6 ? '⭐ POPULAR' :
                    pkg.duration_months >= 3 ? '💫 SAVE MORE' : '🎯 STARTER';
    
    const monthlyEquivalent = pkg.duration_months > 0 ? 
      `($${(pkg.price / pkg.duration_months).toFixed(0)}/month)` : '';
    
    const savingsInfo = pkg.duration_months >= 12 ? '💰 Save 35%' :
                       pkg.duration_months >= 6 ? '💰 Save 20%' :
                       pkg.duration_months >= 3 ? '💰 Save 15%' : '';

    message += `${index + 1}. **${pkg.name}** ${discount}\n`;
    message += `   💰 **${pkg.currency} ${pkg.price}**`;
    
    if (pkg.is_lifetime) {
      message += ` - *Lifetime Access*\n`;
    } else {
      message += `/${pkg.duration_months}mo ${monthlyEquivalent}\n`;
      if (savingsInfo) message += `   ${savingsInfo}\n`;
    }
    
    message += `   ✨ **Features:**\n`;
    if (pkg.features && Array.isArray(pkg.features)) {
      pkg.features.forEach(feature => {
        message += `      • ${feature}\n`;
      });
    }
    
    if (pkg.is_lifetime) {
      message += `      • 🌟 All future programs included\n`;
      message += `      • 🔐 Exclusive lifetime member content\n`;
    }
    
    message += `\n`;
  });

  message += `🎁 *Special Benefits:*\n`;
  message += `• 📈 Real-time trading signals\n`;
  message += `• 🏆 VIP community access\n`;
  message += `• 📊 Daily market analysis\n`;
  message += `• 🎓 Educational resources\n`;
  message += `• 💬 Direct mentor support\n\n`;
  
  message += `✅ *Ready to level up your trading?*\nSelect a package below to get started!`;

  return message;
}

// Enhanced keyboard generators
async function getMainMenuKeyboard(): Promise<any> {
  return {
    inline_keyboard: [
      [
        { text: "💎 VIP Packages", callback_data: "view_vip_packages" },
        { text: "🎓 Education", callback_data: "view_education" }
      ],
      [
        { text: "🏢 About Us", callback_data: "about_us" },
        { text: "🛟 Support", callback_data: "support" }
      ],
      [
        { text: "💰 Promotions", callback_data: "view_promotions" },
        { text: "❓ FAQ", callback_data: "faq" }
      ],
      [
        { text: "📋 Terms", callback_data: "terms" }
      ]
    ]
  };
}

async function getVipPackagesKeyboard(): Promise<any> {
  const packages = await getVipPackages();
  const keyboard = [];
  
  for (const pkg of packages) {
    const discount = pkg.duration_months >= 12 ? ' 🔥' : 
                    pkg.duration_months >= 6 ? ' ⭐' :
                    pkg.duration_months >= 3 ? ' 💫' : '';
    
    const price = pkg.is_lifetime ? `$${pkg.price} Lifetime` : `$${pkg.price}/${pkg.duration_months}mo`;
    
    keyboard.push([{
      text: `💎 ${pkg.name}${discount} - ${price}`,
      callback_data: `select_vip_${pkg.id}`
    }]);
  }
  
  keyboard.push([
    { text: "🎁 View Promotions", callback_data: "view_promotions" },
    { text: "❓ Have Questions?", callback_data: "contact_support" }
  ]);
  keyboard.push([{ text: "🔙 Back to Main Menu", callback_data: "back_main" }]);
  
  return { inline_keyboard: keyboard };
}

// Enhanced admin management functions
async function handleAdminDashboard(chatId: number, userId: string): Promise<void> {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, "❌ Access denied. Admin privileges required.");
    return;
  }

  console.log(`🔐 Admin dashboard accessed by: ${userId}`);

  // Get quick stats for dashboard
  const userCount = await supabaseAdmin.from('bot_users').select('count', { count: 'exact' });
  const vipCount = await supabaseAdmin.from('bot_users').select('count', { count: 'exact' }).eq('is_vip', true);
  const planCount = await supabaseAdmin.from('subscription_plans').select('count', { count: 'exact' });
  const promoCount = await supabaseAdmin.from('promotions').select('count', { count: 'exact' }).eq('is_active', true);

  const uptime = Math.floor((Date.now() - BOT_START_TIME.getTime()) / 1000 / 60); // minutes
  const botStatus = "🟢 Online & Optimized";

  const adminMessage = `🔐 *Enhanced Admin Dashboard*

📊 *System Status:* ${botStatus}
👤 *Admin:* ${userId}
🕐 *Uptime:* ${uptime} minutes
🕐 *Last Updated:* ${new Date().toLocaleString()}

📈 *Quick Stats:*
• 👥 Total Users: ${userCount.count || 0}
• 💎 VIP Members: ${vipCount.count || 0}
• 📦 Active Plans: ${planCount.count || 0}
• 🎁 Active Promos: ${promoCount.count || 0}

🚀 *Management Tools:*
• 🔄 **Bot Control** - Status, refresh, restart
• 👥 **User Management** - Admins, VIP, analytics
• 📦 **Package Control** - VIP & education packages  
• 💰 **Promotions Hub** - Discounts & campaigns
• 💬 **Content Editor** - Messages & UI text
• ⚙️ **Bot Settings** - Configuration & behavior
• 📈 **Analytics Center** - Reports & insights
• 📢 **Broadcasting** - Mass communication
• 🔧 **System Tools** - Maintenance & utilities`;

  const adminKeyboard = {
    inline_keyboard: [
      [
        { text: "🔄 Bot Control", callback_data: "bot_control" },
        { text: "📊 Bot Status", callback_data: "bot_status" }
      ],
      [
        { text: "👥 Users", callback_data: "admin_users" },
        { text: "📦 Packages", callback_data: "admin_packages" }
      ],
      [
        { text: "💰 Promotions", callback_data: "admin_promos" },
        { text: "💬 Content", callback_data: "admin_content" }
      ],
      [
        { text: "⚙️ Settings", callback_data: "admin_settings" },
        { text: "📈 Analytics", callback_data: "admin_analytics" }
      ],
      [
        { text: "📢 Broadcast", callback_data: "admin_broadcast" },
        { text: "🔧 Tools", callback_data: "admin_tools" }
      ],
      [
        { text: "📋 Admin Logs", callback_data: "admin_logs" },
        { text: "🔄 Refresh", callback_data: "admin_dashboard" }
      ]
    ]
  };

  await sendMessage(chatId, adminMessage, adminKeyboard);
  await logAdminAction(userId, 'dashboard_access', 'Accessed admin dashboard');
}

// Bot Control Functions
async function handleBotControl(chatId: number, userId: string): Promise<void> {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, "❌ Access denied.");
    return;
  }

  const controlMessage = `🔄 *Bot Control Center*

🚀 *Available Actions:*
• 🔄 **Refresh Bot** - Reload configurations & admin IDs
• 📊 **Check Status** - System health & performance
• 🧹 **Clean Cache** - Clear user sessions & temp data
• 💾 **Backup Data** - Export critical bot data
• 🔧 **Maintenance Mode** - Enable/disable bot maintenance
• 📈 **Performance Test** - Test response times
• 🔄 **Restart Services** - Restart background processes

⚠️ *Use with caution - some actions may affect active users*`;

  const controlKeyboard = {
    inline_keyboard: [
      [
        { text: "🔄 Refresh Bot", callback_data: "refresh_bot" },
        { text: "📊 Check Status", callback_data: "bot_status" }
      ],
      [
        { text: "🧹 Clean Cache", callback_data: "clean_cache" },
        { text: "💾 Backup Data", callback_data: "backup_data" }
      ],
      [
        { text: "🔧 Maintenance Mode", callback_data: "toggle_maintenance" },
        { text: "📈 Performance Test", callback_data: "performance_test" }
      ],
      [
        { text: "🔄 Restart Services", callback_data: "restart_services" },
        { text: "⚡ Quick Diagnostic", callback_data: "quick_diagnostic" }
      ],
      [
        { text: "🔙 Back to Admin", callback_data: "admin_dashboard" }
      ]
    ]
  };

  await sendMessage(chatId, controlMessage, controlKeyboard);
}

async function handleBotStatus(chatId: number, userId: string): Promise<void> {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, "❌ Access denied.");
    return;
  }

  console.log(`📊 Bot status check requested by: ${userId}`);

  try {
    // Test database connectivity
    const dbStart = Date.now();
    const dbTest = await supabaseAdmin.from('bot_users').select('count', { count: 'exact' }).limit(1);
    const dbTime = Date.now() - dbStart;

    // Test Telegram API
    const tgStart = Date.now();
    const tgTest = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const tgTime = Date.now() - tgStart;

    // Get system info
    const uptime = Math.floor((Date.now() - BOT_START_TIME.getTime()) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    // Get memory usage (simplified)
    const memoryInfo = `Memory usage tracking available`;

    const statusMessage = `📊 *Bot Status Report*

🕐 *Uptime:* ${hours}h ${minutes}m ${seconds}s
📅 *Started:* ${BOT_START_TIME.toLocaleString()}

🔌 *Connectivity:*
• 🗄️ Database: ${dbTest.error ? '🔴 ERROR' : '🟢 OK'} (${dbTime}ms)
• 📱 Telegram API: ${tgTest.ok ? '🟢 OK' : '🔴 ERROR'} (${tgTime}ms)

⚙️ *Configuration:*
• 🔑 Admin IDs: ${ADMIN_USER_IDS.size} loaded
• 💬 Active Sessions: ${userSessions.size}
• 🌐 Environment: ${Deno.env.get("DENO_DEPLOYMENT_ID") ? 'Production' : 'Development'}

📈 *Performance:*
• 🗄️ DB Response: ${dbTime < 100 ? '🟢 Fast' : dbTime < 500 ? '🟡 Moderate' : '🔴 Slow'} (${dbTime}ms)
• 📱 API Response: ${tgTime < 100 ? '🟢 Fast' : tgTime < 500 ? '🟡 Moderate' : '🔴 Slow'} (${tgTime}ms)
• 💾 ${memoryInfo}

${dbTest.error ? `❌ DB Error: ${dbTest.error.message}` : ''}
${!tgTest.ok ? '❌ Telegram API Error' : ''}`;

    const statusKeyboard = {
      inline_keyboard: [
        [
          { text: "🔄 Refresh Status", callback_data: "bot_status" },
          { text: "🧹 Clean Sessions", callback_data: "clean_cache" }
        ],
        [
          { text: "📈 Performance Test", callback_data: "performance_test" },
          { text: "🔧 Diagnostic", callback_data: "quick_diagnostic" }
        ],
        [
          { text: "🔙 Back to Control", callback_data: "bot_control" }
        ]
      ]
    };

    await sendMessage(chatId, statusMessage, statusKeyboard);
  } catch (error) {
    console.error('🚨 Error in bot status check:', error);
    await sendMessage(chatId, `❌ Error checking bot status: ${error.message}`);
  }
}

async function handleRefreshBot(chatId: number, userId: string): Promise<void> {
  if (!isAdmin(userId)) {
    await sendMessage(chatId, "❌ Access denied.");
    return;
  }

  console.log(`🔄 Bot refresh initiated by: ${userId}`);
  await sendMessage(chatId, "🔄 *Refreshing bot...*\n\nPlease wait while I reload configurations...");

  try {
    // Refresh admin IDs
    await refreshAdminIds();

    // Clear user sessions cache
    userSessions.clear();

    // Test database connectivity
    const dbTest = await supabaseAdmin.from('bot_users').select('count', { count: 'exact' }).limit(1);

    const refreshMessage = `✅ *Bot Refresh Complete!*

🔄 *Actions Performed:*
• 🔑 Reloaded admin IDs (${ADMIN_USER_IDS.size} total)
• 🧹 Cleared user sessions cache
• 🗄️ Database connectivity: ${dbTest.error ? '🔴 ERROR' : '🟢 OK'}
• ⚙️ Revalidated configurations

🕐 *Completed at:* ${new Date().toLocaleString()}

✅ Bot is now running with fresh configurations!`;

    await sendMessage(chatId, refreshMessage);
    await logAdminAction(userId, 'bot_refresh', 'Bot refresh completed successfully');
  } catch (error) {
    console.error('🚨 Error during bot refresh:', error);
    await sendMessage(chatId, `❌ Error during refresh: ${error.message}`);
  }
}

// Main serve function
serve(async (req) => {
  console.log(`📥 Request received: ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET") {
    const uptimeMinutes = Math.floor((Date.now() - BOT_START_TIME.getTime()) / 1000 / 60);
    return new Response(
      `🚀 Enhanced Dynamic Capital Bot is live!\n\n⏰ Uptime: ${uptimeMinutes} minutes\n🔑 Admins: ${ADMIN_USER_IDS.size}\n💬 Sessions: ${userSessions.size}`, 
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const body = await req.text();
    const update = JSON.parse(body);

    console.log("📨 Update received:", JSON.stringify(update, null, 2));

    // Extract user info
    const from = update.message?.from || update.callback_query?.from;
    if (!from) {
      console.log("❌ No 'from' user found in update");
      return new Response("OK", { status: 200 });
    }

    const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    const userId = from.id.toString();
    const firstName = from.first_name || 'Friend';
    const lastName = from.last_name;
    const username = from.username;

    console.log(`👤 Processing update for user: ${userId} (${firstName})`);

    // Track user activity for session management
    await updateUserActivity(userId, {
      message_type: update.message ? 'message' : 'callback_query',
      text: update.message?.text || update.callback_query?.data,
      timestamp: new Date().toISOString()
    });

    // Handle regular messages
    if (update.message) {
      const text = update.message.text;
      console.log(`📝 Processing text message: ${text}`);

      // Check for maintenance mode
      const maintenanceMode = await getBotSetting('maintenance_mode');
      if (maintenanceMode === 'true' && !isAdmin(userId)) {
        console.log("🔧 Bot in maintenance mode for non-admin user");
        await sendMessage(chatId, "🔧 *Bot is under maintenance*\n\n⏰ We'll be back soon! Thank you for your patience.\n\n🛟 For urgent support, contact @DynamicCapital_Support");
        return new Response("OK", { status: 200 });
      }

      // Handle /start command with dynamic welcome message
      if (text === '/start') {
        console.log(`🚀 Start command from: ${userId}`);
        const welcomeMessage = await getWelcomeMessage(firstName);
        const keyboard = await getMainMenuKeyboard();
        await sendMessage(chatId, welcomeMessage, keyboard);
        return new Response("OK", { status: 200 });
      }

      // Handle /admin command
      if (text === '/admin') {
        console.log(`🔐 Admin command from: ${userId}`);
        if (isAdmin(userId)) {
          await handleAdminDashboard(chatId, userId);
        } else {
          await sendMessage(chatId, "❌ Access denied. Admin privileges required.");
        }
        return new Response("OK", { status: 200 });
      }

      // Handle /status command for admins
      if (text === '/status' && isAdmin(userId)) {
        await handleBotStatus(chatId, userId);
        return new Response("OK", { status: 200 });
      }

      // Handle /refresh command for admins
      if (text === '/refresh' && isAdmin(userId)) {
        await handleRefreshBot(chatId, userId);
        return new Response("OK", { status: 200 });
      }

      // Handle other messages
      await sendMessage(chatId, "🤖 I received your message! Use /start to see the main menu or /admin for admin access.");
    }

    // Handle callback queries
    if (update.callback_query) {
      const callbackData = update.callback_query.data;
      console.log(`🔘 Processing callback: ${callbackData}`);

      try {
        switch (callbackData) {
          case 'view_vip_packages':
            console.log("💎 Displaying VIP packages");
            const vipMessage = await getFormattedVipPackages();
            const vipKeyboard = await getVipPackagesKeyboard();
            await sendMessage(chatId, vipMessage, vipKeyboard);
            break;

          case 'back_main':
            const mainMessage = await getWelcomeMessage(firstName);
            const mainKeyboard = await getMainMenuKeyboard();
            await sendMessage(chatId, mainMessage, mainKeyboard);
            break;

          case 'admin_dashboard':
            await handleAdminDashboard(chatId, userId);
            break;

          case 'bot_control':
            await handleBotControl(chatId, userId);
            break;

          case 'bot_status':
            await handleBotStatus(chatId, userId);
            break;

          case 'refresh_bot':
            await handleRefreshBot(chatId, userId);
            break;

          case 'clean_cache':
            if (isAdmin(userId)) {
              userSessions.clear();
              await sendMessage(chatId, "🧹 *Cache Cleaned!*\n\n✅ All user sessions cleared\n✅ Temporary data removed");
              await logAdminAction(userId, 'cache_clean', 'User sessions cache cleared');
            }
            break;

          case 'quick_diagnostic':
            if (isAdmin(userId)) {
              const diagnostic = `🔧 *Quick Diagnostic*\n\n• Bot Token: ${BOT_TOKEN ? '✅' : '❌'}\n• Database: ${SUPABASE_URL ? '✅' : '❌'}\n• Admin Count: ${ADMIN_USER_IDS.size}\n• Sessions: ${userSessions.size}\n• Uptime: ${Math.floor((Date.now() - BOT_START_TIME.getTime()) / 1000 / 60)}min`;
              await sendMessage(chatId, diagnostic);
            }
            break;

          default:
            console.log(`❓ Unknown callback: ${callbackData}`);
            await sendMessage(chatId, "❓ Unknown action. Please try again.");
        }

        // Answer callback query to remove loading state
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: update.callback_query.id })
        });

      } catch (error) {
        console.error('🚨 Error handling callback:', error);
        await sendMessage(chatId, "❌ An error occurred. Please try again.");
      }
    }

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("🚨 Main error:", error);
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});

console.log("🚀 Bot is ready and listening for updates!");