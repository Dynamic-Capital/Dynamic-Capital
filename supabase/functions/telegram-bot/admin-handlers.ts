// Enhanced admin handlers for comprehensive table management
// Includes handlers for user sessions, payments, broadcasts, bank accounts,
// auto reply templates, and daily analytics
import { createClient } from "../_shared/client.ts";
import { optionalEnv, requireEnv } from "../_shared/env.ts";
import { expectedSecret } from "../_shared/telegram_secret.ts";
import { isAdmin as isEnvAdmin } from "../_shared/telegram.ts";

const { TELEGRAM_BOT_TOKEN: BOT_TOKEN } = requireEnv([
  "TELEGRAM_BOT_TOKEN",
] as const);

const supabaseAdmin = createClient();

// Import utility functions
import {
  getBotContent,
  logAdminAction,
  processPlanEditInput,
} from "./database-utils.ts";
// Removed cross-import of config helpers; provide local flag helpers for Edge isolation
// Simple implementation stores flags in bot_settings with keys prefixed by "flag_"

type FlagMap = Record<string, boolean>;
const FLAG_PREFIX = "flag_";

async function preview(): Promise<{ data: FlagMap }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("bot_settings")
      .select("setting_key, setting_value")
      .like("setting_key", `${FLAG_PREFIX}%`);
    if (error) throw error;
    const map: FlagMap = {};
    for (const row of (data as Array<Record<string, unknown>>) ?? []) {
      const key: string = (row.setting_key as string) || "";
      const valRaw: string = String(row.setting_value ?? "");
      const normalized = valRaw.toLowerCase();
      const boolVal = normalized === "true" || normalized === "1" ||
        normalized === "on";
      map[key.replace(FLAG_PREFIX, "")] = boolVal;
    }
    return { data: map };
  } catch (e) {
    console.error("preview flags error", e);
    return { data: {} };
  }
}

async function setFlag(name: string, value: boolean): Promise<void> {
  try {
    const key = `${FLAG_PREFIX}${name}`;
    const { error } = await supabaseAdmin
      .from("bot_settings")
      .upsert({
        setting_key: key,
        setting_value: value ? "true" : "false",
        is_active: true,
      }, { onConflict: "setting_key" });
    if (error) throw error;
  } catch (e) {
    console.error("setFlag error", e);
  }
}

async function publishFlags(chatId: number, userId: string): Promise<void> {
  try {
    const draft = await preview();
    const now = Date.now();

    const { data: currentRow, error: currentErr } = await supabaseAdmin
      .from("kv_config")
      .select("value")
      .eq("key", "features:published")
      .maybeSingle();
    if (currentErr) throw currentErr;

    const current = (currentRow?.value as { ts: number; data: FlagMap }) ?? {
      ts: now,
      data: {},
    };

    const { error: rollbackErr } = await supabaseAdmin.from("kv_config").upsert({
      key: "features:rollback",
      value: current,
    });
    if (rollbackErr) throw rollbackErr;

    const { error: publishErr } = await supabaseAdmin.from("kv_config").upsert({
      key: "features:published",
      value: { ts: now, data: draft.data },
    });
    if (publishErr) throw publishErr;

    await logAdminAction(
      userId,
      "publish_flags",
      "Published feature flags",
      "kv_config",
    );
    await sendMessage(chatId, "✅ Flags published successfully.");
  } catch (e) {
    console.error("publishFlags error", e);
    await sendMessage(
      chatId,
      `❌ Failed to publish flags: ${e instanceof Error ? e.message : e}`,
    );
  }
}

async function rollbackFlags(chatId: number, userId: string): Promise<void> {
  try {
    const now = Date.now();
    const { data: publishedRow, error: publishedErr } = await supabaseAdmin
      .from("kv_config")
      .select("value")
      .eq("key", "features:published")
      .maybeSingle();
    if (publishedErr) throw publishedErr;
    const published =
      (publishedRow?.value as { ts: number; data: FlagMap }) ?? {
        ts: now,
        data: {},
      };

    const { data: rollbackRow, error: rollbackErr } = await supabaseAdmin
      .from("kv_config")
      .select("value")
      .eq("key", "features:rollback")
      .maybeSingle();
    if (rollbackErr) throw rollbackErr;
    const previous =
      (rollbackRow?.value as { ts: number; data: FlagMap }) ?? {
        ts: now,
        data: {},
      };

    const { error: setPubErr } = await supabaseAdmin.from("kv_config").upsert({
      key: "features:published",
      value: previous,
    });
    if (setPubErr) throw setPubErr;

    const { error: setRollbackErr } = await supabaseAdmin.from("kv_config").upsert({
      key: "features:rollback",
      value: published,
    });
    if (setRollbackErr) throw setRollbackErr;

    // sync bot_settings with rolled-back snapshot
    const rows = Object.entries(previous.data).map(([name, val]) => ({
      setting_key: `${FLAG_PREFIX}${name}`,
      setting_value: val ? "true" : "false",
      is_active: true,
    }));
    const { error: delErr } = await supabaseAdmin
      .from("bot_settings")
      .delete()
      .like("setting_key", `${FLAG_PREFIX}%`);
    if (delErr) throw delErr;
    if (rows.length) {
      const { error: insErr } = await supabaseAdmin.from("bot_settings").insert(
        rows,
      );
      if (insErr) throw insErr;
    }

    await logAdminAction(
      userId,
      "rollback_flags",
      "Rolled back feature flags",
      "kv_config",
    );
    await sendMessage(chatId, "✅ Flags rolled back.");
  } catch (e) {
    console.error("rollbackFlags error", e);
    await sendMessage(
      chatId,
      `❌ Failed to rollback flags: ${e instanceof Error ? e.message : e}`,
    );
  }
}

export async function sendMessage(
  chatId: number,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    reply_markup: replyMarkup,
    parse_mode: "Markdown",
  };

  try {
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

    return await response.json();
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return null;
  }
}

interface MessageSection {
  title: string;
  items: string[];
  numbered?: boolean;
}

function buildMessage(title: string, sections: MessageSection[]): string {
  const lines: string[] = [title];
  for (const section of sections) {
    lines.push("", section.title);
    section.items.forEach((item, index) => {
      const itemLines = item.split("\n");
      const prefix = section.numbered ? `${index + 1}. ` : "• ";
      lines.push(prefix + itemLines[0]);
      for (let i = 1; i < itemLines.length; i++) {
        lines.push(`   ${itemLines[i]}`);
      }
    });
  }
  return lines.join("\n");
}

async function isAdmin(userId: string): Promise<boolean> {
  if (isEnvAdmin(userId)) return true;
  try {
    const numId = Number(userId);
    const idFilter = Number.isFinite(numId) ? numId : userId;
    const { data } = await supabaseAdmin
      .from("bot_users")
      .select("is_admin")
      .eq("telegram_id", idFilter)
      .maybeSingle();
    return data?.is_admin === true;
  } catch (_e) {
    return false;
  }
}

export async function handleAdminDashboard(
  chatId: number,
  userId: string,
): Promise<void> {
  if (!(await isAdmin(userId))) {
    await sendMessage(chatId, "❌ Access denied.");
    return;
  }
  const defaultMsg = "⚙️ *Admin Dashboard*\nSelect an option:";
  const msg = (await getBotContent("admin_dashboard_message")) || defaultMsg;
  const keyboard = {
    inline_keyboard: [
      [{ text: "🗃 Tables", callback_data: "table_management" }],
      [{ text: "🚩 Feature Flags", callback_data: "feature_flags" }],
      [{ text: "🌍 Env Status", callback_data: "env_status" }],
    ],
  };
  await sendMessage(chatId, msg, keyboard);
}

// Enhanced table management handlers
export async function handleTableManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  const defaultTableMessage = `🗃️ *Database Table Management*

📊 *Available Tables:*
• 👥 **Bot Users** - User management & admin status
• 💎 **Subscription Plans** - VIP packages & pricing
• 📢 **Plan Channels** - Channel & group links per plan
• 🎓 **Education Packages** - Courses & learning content
• 💰 **Promotions** - Discount codes & campaigns
• 📱 **Bot Content** - Messages & UI text
• ⚙️ **Bot Settings** - Configuration & behavior
• 📈 **Analytics** - User data & conversion tracking
• 💬 **User Sessions** - Active sessions & state
• 🎯 **User Interactions** - Activity tracking
• 💳 **Payments** - Transaction records
• 📢 **Broadcast Messages** - Mass communication
• 🏦 **Bank Accounts** - Payment methods
• 📝 **Auto Reply Templates** - Automated responses

🔧 *Management Actions:*
View, Create, Edit, Delete, Export data for any table.`;

  const tableMessage = (await getBotContent("table_management_message")) ||
    defaultTableMessage;

  const tableKeyboard = {
    inline_keyboard: [
      [
        { text: "👥 Users", callback_data: "manage_table_bot_users" },
        {
          text: "💎 VIP Plans",
          callback_data: "manage_table_subscription_plans",
        },
      ],
      [
        {
          text: "📢 Plan Channels",
          callback_data: "manage_table_plan_channels",
        },
        {
          text: "🎓 Education",
          callback_data: "manage_table_education_packages",
        },
      ],
      [
        { text: "💰 Promotions", callback_data: "manage_table_promotions" },
        { text: "📱 Content", callback_data: "manage_table_bot_content" },
      ],
      [
        { text: "⚙️ Settings", callback_data: "manage_table_bot_settings" },
        { text: "📈 Analytics", callback_data: "manage_table_daily_analytics" },
      ],
      [
        { text: "💬 Sessions", callback_data: "manage_table_user_sessions" },
        { text: "💳 Payments", callback_data: "manage_table_payments" },
      ],
      [
        {
          text: "📢 Broadcasts",
          callback_data: "manage_table_broadcast_messages",
        },
        {
          text: "🏦 Bank Accounts",
          callback_data: "manage_table_bank_accounts",
        },
      ],
      [
        {
          text: "📝 Templates",
          callback_data: "manage_table_auto_reply_templates",
        },
        { text: "📊 Quick Stats", callback_data: "table_stats_overview" },
      ],
      [
        { text: "💾 Export All", callback_data: "export_all_tables" },
      ],
      [
        { text: "🔙 Back to Admin", callback_data: "admin_dashboard" },
      ],
    ],
  };

  await sendMessage(chatId, tableMessage, tableKeyboard);
}

// Individual table management handlers
export async function handleUserTableManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: users, error: _error } = await supabaseAdmin
      .from("bot_users")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const totalCount = await supabaseAdmin
      .from("bot_users")
      .select("count", { count: "exact" });

    const adminCount = await supabaseAdmin
      .from("bot_users")
      .select("count", { count: "exact" })
      .eq("is_admin", true);

    const vipCount = await supabaseAdmin
      .from("bot_users")
      .select("count", { count: "exact" })
      .eq("is_vip", true);

    const userMessage = buildMessage("👥 *Bot Users Management*", [
      {
        title: "📊 *Statistics:*",
        items: [
          `Total Users: ${totalCount.count || 0}`,
          `Admin Users: ${adminCount.count || 0}`,
          `VIP Users: ${vipCount.count || 0}`,
        ],
      },
      {
        title: "👤 *Recent Users (Last 10):*",
        items: users?.map((user: any) => {
          const status = user.is_admin ? "🔑" : user.is_vip ? "💎" : "👤";
          return `${status} ${user.first_name || "Unknown"} (@${
            user.username || "N/A"
          })\nID: ${user.telegram_id} | Joined: ${
            new Date(user.created_at).toLocaleDateString()
          }`;
        }) || [],
        numbered: true,
      },
    ]);

    const userKeyboard = {
      inline_keyboard: [
        [
          { text: "➕ Add Admin", callback_data: "add_admin_user" },
          { text: "🔍 Search User", callback_data: "search_user" },
        ],
        [
          { text: "💎 Manage VIP", callback_data: "manage_vip_users" },
          { text: "📊 Export Users", callback_data: "export_users" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_bot_users" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, userMessage, userKeyboard);
  } catch (error) {
    console.error("Error in user table management:", error);
    await sendMessage(chatId, "❌ Error fetching user data. Please try again.");
  }
}

export async function handleSubscriptionPlansManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching subscription plans:", error);
      await sendMessage(
        chatId,
        "❌ Error fetching subscription plans. Please try again.",
      );
      return;
    }

    const planMessage = buildMessage("💎 *VIP Subscription Plans Management*", [
      {
        title: `📦 *Current Plans (${plans?.length || 0}):*`,
        items: plans?.map((plan: any) => {
          const duration = plan.is_lifetime
            ? "Lifetime"
            : `${plan.duration_months} months`;
          return `**${plan.name}**\n💰 ${plan.currency} ${plan.price} (${duration})\n✨ Features: ${
            plan.features?.length || 0
          } items\nID: \`${plan.id}\``;
        }) || [],
        numbered: true,
      },
    ]);

    const planKeyboard = {
      inline_keyboard: [
        [
          { text: "➕ Create Plan", callback_data: "create_vip_plan" },
          { text: "✏️ Edit Plan", callback_data: "edit_vip_plan" },
        ],
        [
          { text: "🗑️ Delete Plan", callback_data: "delete_vip_plan" },
          { text: "📊 Plan Stats", callback_data: "vip_plan_stats" },
        ],
        [
          { text: "💰 Update Pricing", callback_data: "update_plan_pricing" },
          { text: "🎯 Manage Features", callback_data: "manage_plan_features" },
        ],
        [
          {
            text: "🔄 Refresh",
            callback_data: "manage_table_subscription_plans",
          },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, planMessage, planKeyboard);
  } catch (error) {
    console.error("Error in subscription plans management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching subscription plans. Please try again.",
    );
  }
}

export async function handlePlanChannelsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: channels, error } = await supabaseAdmin
      .from("plan_channels")
      .select("channel_name, channel_type, invite_link, is_active, plan_id")
      .order("channel_name");

    if (error) {
      console.error("Error fetching plan channels:", error);
      await sendMessage(
        chatId,
        "❌ Error fetching plan channels. Please try again.",
      );
      return;
    }

    let msg = `📢 *Plan Channels Management*\n\n`;
    channels?.forEach((channel: any, index: number) => {
      msg += `${
        index + 1
      }. ${channel.channel_name} (${channel.channel_type})\n`;
      msg += `   🔗 ${channel.invite_link}\n`;
      msg += `   Plan: \`${channel.plan_id}\`\n`;
      msg += `   Status: ${
        channel.is_active ? "✅ Active" : "⛔ Inactive"
      }\n\n`;
    });

    const keyboard = {
      inline_keyboard: [
        [
          { text: "🔄 Refresh", callback_data: "manage_table_plan_channels" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, msg, keyboard);
  } catch (error) {
    console.error("Error in plan channels management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching plan channels. Please try again.",
    );
  }
}

// Handle VIP plan editing workflow
export async function handleEditVipPlan(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching plans for editing:", error);
      await sendMessage(chatId, "❌ Error fetching plans. Please try again.");
      return;
    }

    if (!plans || plans.length === 0) {
      await sendMessage(chatId, "❌ No VIP plans found. Create a plan first.");
      return;
    }

    let editMessage = `✏️ *Select Plan to Edit*\n\n`;
    editMessage += `📦 *Available Plans:*\n\n`;

    const editKeyboard = {
      inline_keyboard: [
        ...plans.map((plan: any, index: number) => [{
          text: `${index + 1}. ${plan.name} ($${plan.price})`,
          callback_data: `edit_plan_${plan.id}`,
        }]),
        [{ text: "🔙 Back", callback_data: "manage_table_subscription_plans" }],
      ],
    };

    await sendMessage(chatId, editMessage, editKeyboard);
  } catch (error) {
    console.error("Error in handleEditVipPlan:", error);
    await sendMessage(
      chatId,
      "❌ Error loading plans for editing. Please try again.",
    );
  }
}

// Handle specific plan editing
export async function handleEditSpecificPlan(
  chatId: number,
  _userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      console.error("Error fetching plan for editing:", error);
      await sendMessage(chatId, "❌ Plan not found. Please try again.");
      return;
    }

    const duration = plan.is_lifetime
      ? "Lifetime"
      : `${plan.duration_months} months`;
    let planDetails = `✏️ *Editing Plan: ${plan.name}*\n\n`;
    planDetails += `💰 **Current Price:** ${plan.currency} ${plan.price}\n`;
    planDetails += `⏰ **Duration:** ${duration}\n`;
    planDetails += `✨ **Features (${plan.features?.length || 0}):**\n`;

    if (plan.features && plan.features.length > 0) {
      plan.features.forEach((feature: string, index: number) => {
        planDetails += `   ${index + 1}. ${feature}\n`;
      });
    } else {
      planDetails += `   No features configured\n`;
    }

    planDetails += `\n📅 **Created:** ${
      new Date(plan.created_at).toLocaleDateString()
    }\n`;
    planDetails += `🔄 **Updated:** ${
      new Date(plan.updated_at).toLocaleDateString()
    }\n\n`;
    planDetails += `What would you like to edit?`;

    const editOptionsKeyboard = {
      inline_keyboard: [
        [
          { text: "💰 Edit Price", callback_data: `edit_plan_price_${planId}` },
          { text: "📝 Edit Name", callback_data: `edit_plan_name_${planId}` },
        ],
        [
          {
            text: "⏰ Edit Duration",
            callback_data: `edit_plan_duration_${planId}`,
          },
          {
            text: "✨ Edit Features",
            callback_data: `edit_plan_features_${planId}`,
          },
        ],
        [
          {
            text: "🔄 Toggle Lifetime",
            callback_data: `toggle_plan_lifetime_${planId}`,
          },
          {
            text: "💱 Change Currency",
            callback_data: `edit_plan_currency_${planId}`,
          },
        ],
        [
          {
            text: "🗑️ Delete Plan",
            callback_data: `confirm_delete_plan_${planId}`,
          },
        ],
        [
          {
            text: "🔙 Back to Plans",
            callback_data: "manage_table_subscription_plans",
          },
        ],
      ],
    };

    await sendMessage(chatId, planDetails, editOptionsKeyboard);
  } catch (error) {
    console.error("Error in handleEditSpecificPlan:", error);
    await sendMessage(
      chatId,
      "❌ Error loading plan details. Please try again.",
    );
  }
}

// Handle plan price editing
export async function handleEditPlanPrice(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name, price, currency")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const priceMessage = `💰 *Edit Price for ${plan.name}*\n\n` +
      `Current Price: **${plan.currency} ${plan.price}**\n\n` +
      `Please send the new price (numbers only):\n` +
      `Example: 49.99`;

    const cancelKeyboard = {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: `edit_plan_${planId}` }],
      ],
    };

    await sendMessage(chatId, priceMessage, cancelKeyboard);

    // Set user session to await price input
    await supabaseAdmin
      .from("user_sessions")
      .upsert({
        telegram_user_id: userId,
        awaiting_input: "plan_price",
        session_data: { plan_id: planId, plan_name: plan.name },
        last_activity: new Date().toISOString(),
        is_active: true,
      });
  } catch (error) {
    console.error("Error in handleEditPlanPrice:", error);
    await sendMessage(
      chatId,
      "❌ Error setting up price editing. Please try again.",
    );
  }
}

// Handle plan name editing
export async function handleEditPlanName(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const nameMessage = `📝 *Edit Name for Plan*\n\n` +
      `Current Name: **${plan.name}**\n\n` +
      `Please send the new plan name:`;

    const cancelKeyboard = {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: `edit_plan_${planId}` }],
      ],
    };

    await sendMessage(chatId, nameMessage, cancelKeyboard);

    // Set user session to await name input
    await supabaseAdmin
      .from("user_sessions")
      .upsert({
        telegram_user_id: userId,
        awaiting_input: "plan_name",
        session_data: { plan_id: planId },
        last_activity: new Date().toISOString(),
        is_active: true,
      });
  } catch (error) {
    console.error("Error in handleEditPlanName:", error);
    await sendMessage(
      chatId,
      "❌ Error setting up name editing. Please try again.",
    );
  }
}

// Handle plan duration editing
export async function handleEditPlanDuration(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name, duration_months, is_lifetime")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const currentDuration = plan.is_lifetime
      ? "Lifetime"
      : `${plan.duration_months} months`;
    const durationMessage = `⏰ *Edit Duration for ${plan.name}*\n\n` +
      `Current Duration: **${currentDuration}**\n\n` +
      `Please send the new duration in months (numbers only):\n` +
      `Example: 12 (for 12 months)\n` +
      `Or send "lifetime" for lifetime access`;

    const cancelKeyboard = {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: `edit_plan_${planId}` }],
      ],
    };

    await sendMessage(chatId, durationMessage, cancelKeyboard);

    // Set user session to await duration input
    await supabaseAdmin
      .from("user_sessions")
      .upsert({
        telegram_user_id: userId,
        awaiting_input: "plan_duration",
        session_data: { plan_id: planId, plan_name: plan.name },
        last_activity: new Date().toISOString(),
        is_active: true,
      });
  } catch (error) {
    console.error("Error in handleEditPlanDuration:", error);
    await sendMessage(
      chatId,
      "❌ Error setting up duration editing. Please try again.",
    );
  }
}

// Handle plan features editing
export async function handleEditPlanFeatures(
  chatId: number,
  _userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name, features")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    let featuresMessage = `✨ *Edit Features for ${plan.name}*\n\n`;
    featuresMessage += `📋 **Current Features:**\n`;

    if (plan.features && plan.features.length > 0) {
      plan.features.forEach((feature: string, index: number) => {
        featuresMessage += `${index + 1}. ${feature}\n`;
      });
    } else {
      featuresMessage += `No features configured\n`;
    }

    featuresMessage += `\nWhat would you like to do?`;

    const featuresKeyboard = {
      inline_keyboard: [
        [
          {
            text: "➕ Add Feature",
            callback_data: `add_plan_feature_${planId}`,
          },
          {
            text: "🗑️ Remove Feature",
            callback_data: `remove_plan_feature_${planId}`,
          },
        ],
        [
          {
            text: "🔄 Replace All",
            callback_data: `replace_plan_features_${planId}`,
          },
        ],
        [
          { text: "🔙 Back", callback_data: `edit_plan_${planId}` },
        ],
      ],
    };

    await sendMessage(chatId, featuresMessage, featuresKeyboard);
  } catch (error) {
    console.error("Error in handleEditPlanFeatures:", error);
    await sendMessage(
      chatId,
      "❌ Error loading plan features. Please try again.",
    );
  }
}

// Handle adding a feature to a plan
export async function handleAddPlanFeature(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const addFeatureMessage = `➕ *Add Feature to ${plan.name}*\n\n` +
      `Please send the new feature description:\n` +
      `Example: "Premium trading signals"\n` +
      `Example: "24/7 customer support"`;

    const cancelKeyboard = {
      inline_keyboard: [
        [{ text: "❌ Cancel", callback_data: `edit_plan_features_${planId}` }],
      ],
    };

    await sendMessage(chatId, addFeatureMessage, cancelKeyboard);

    // Set user session to await feature input
    await supabaseAdmin
      .from("user_sessions")
      .upsert({
        telegram_user_id: userId,
        awaiting_input: "plan_add_feature",
        session_data: { plan_id: planId, plan_name: plan.name },
        last_activity: new Date().toISOString(),
        is_active: true,
      });
  } catch (error) {
    console.error("Error in handleAddPlanFeature:", error);
    await sendMessage(
      chatId,
      "❌ Error setting up feature addition. Please try again.",
    );
  }
}

// Process text input for plan editing
export async function handlePlanEditInput(
  chatId: number,
  userId: string,
  text: string,
): Promise<boolean> {
  try {
    const { data: session } = await supabaseAdmin
      .from("user_sessions")
      .select("awaiting_input, session_data")
      .eq("telegram_user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    const planId = session?.session_data?.plan_id as string | undefined;
    const awaiting = session?.awaiting_input as string | undefined;

    if (!planId || !awaiting) return false;

    const result = await processPlanEditInput(userId, text, {
      plan_id: planId,
      awaiting_input: awaiting,
    });

    await sendMessage(chatId, result.message);

    if (result.success) {
      await supabaseAdmin
        .from("user_sessions")
        .update({
          awaiting_input: null,
          session_data: null,
          is_active: false,
          last_activity: new Date().toISOString(),
        })
        .eq("telegram_user_id", userId);

      if (result.planId) {
        await handleEditSpecificPlan(chatId, userId, result.planId);
      }
    }

    return true;
  } catch (error) {
    console.error("Error in handlePlanEditInput:", error);
    await sendMessage(chatId, "❌ Error processing input. Please try again.");
    return false;
  }
}

// Handle creating a new VIP plan
export async function handleCreateVipPlan(
  chatId: number,
  userId: string,
): Promise<void> {
  const createMessage = `➕ *Create New VIP Plan*\n\n` +
    `Please send the plan details in this format:\n\n` +
    `**Format:**\n` +
    `Name: Plan Name\n` +
    `Price: 49.99\n` +
    `Duration: 1 (months, or "lifetime")\n` +
    `Currency: USD\n` +
    `Features: Feature 1, Feature 2, Feature 3\n\n` +
    `**Example:**\n` +
    `Name: Premium VIP\n` +
    `Price: 99.99\n` +
    `Duration: 3\n` +
    `Currency: USD\n` +
    `Features: Premium signals, VIP chat, Priority support`;

  const cancelKeyboard = {
    inline_keyboard: [
      [{ text: "❌ Cancel", callback_data: "manage_table_subscription_plans" }],
    ],
  };

  await sendMessage(chatId, createMessage, cancelKeyboard);

  // Set user session to await plan creation input
  await supabaseAdmin
    .from("user_sessions")
    .upsert({
      telegram_user_id: userId,
      awaiting_input: "create_vip_plan",
      session_data: {},
      last_activity: new Date().toISOString(),
      is_active: true,
    });
}

// Handle plan deletion confirmation
export async function handleDeleteVipPlan(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: plans, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .order("price", { ascending: true });

    if (error) {
      console.error("Error fetching plans for deletion:", error);
      await sendMessage(chatId, "❌ Error fetching plans. Please try again.");
      return;
    }

    if (!plans || plans.length === 0) {
      await sendMessage(chatId, "❌ No VIP plans found to delete.");
      return;
    }

    let deleteMessage = `🗑️ *Select Plan to Delete*\n\n`;
    deleteMessage += `⚠️ **WARNING:** This action cannot be undone!\n\n`;
    deleteMessage += `📦 *Available Plans:*\n\n`;

    const deleteKeyboard = {
      inline_keyboard: [
        ...plans.map((plan: any, index: number) => [{
          text: `🗑️ ${index + 1}. ${plan.name} ($${plan.price})`,
          callback_data: `confirm_delete_plan_${plan.id}`,
        }]),
        [{ text: "🔙 Back", callback_data: "manage_table_subscription_plans" }],
      ],
    };

    await sendMessage(chatId, deleteMessage, deleteKeyboard);
  } catch (error) {
    console.error("Error in handleDeleteVipPlan:", error);
    await sendMessage(
      chatId,
      "❌ Error loading plans for deletion. Please try again.",
    );
  }
}

// Handle plan deletion confirmation
export async function handleConfirmDeletePlan(
  chatId: number,
  _userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name, price")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const confirmMessage = `⚠️ *Confirm Plan Deletion*\n\n` +
      `Are you sure you want to delete:\n` +
      `**${plan.name}** ($${plan.price})\n\n` +
      `⚠️ This action cannot be undone!`;

    const confirmKeyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Yes, Delete",
            callback_data: `delete_plan_confirmed_${planId}`,
          },
          { text: "❌ Cancel", callback_data: `edit_plan_${planId}` },
        ],
      ],
    };

    await sendMessage(chatId, confirmMessage, confirmKeyboard);
  } catch (error) {
    console.error("Error in handleConfirmDeletePlan:", error);
    await sendMessage(
      chatId,
      "❌ Error setting up plan deletion. Please try again.",
    );
  }
}

// Execute plan deletion
export async function handleExecuteDeletePlan(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    // First check if plan has active subscriptions
    const { data: activeSubscriptions, error: subError } = await supabaseAdmin
      .from("user_subscriptions")
      .select("count")
      .eq("plan_id", planId)
      .eq("is_active", true);

    if (subError) {
      console.error("Error checking active subscriptions:", subError);
    }

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      await sendMessage(
        chatId,
        `❌ Cannot delete plan!\n\n` +
          `This plan has ${activeSubscriptions.length} active subscription(s).\n` +
          `Please wait for subscriptions to expire or manually deactivate them first.`,
      );
      return;
    }

    // Get plan name for confirmation
    const { data: plan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("name")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    // Delete the plan
    const { error: deleteError } = await supabaseAdmin
      .from("subscription_plans")
      .delete()
      .eq("id", planId);

    if (deleteError) {
      console.error("Error deleting plan:", deleteError);
      await sendMessage(
        chatId,
        `❌ Error deleting plan: ${deleteError.message}`,
      );
      return;
    }

    // Log admin action
    await logAdminAction(
      userId,
      "plan_delete",
      `Deleted VIP plan: ${plan.name}`,
      "subscription_plans",
      planId,
    );

    await sendMessage(
      chatId,
      `✅ *Plan Deleted Successfully*\n\n` +
        `**${plan.name}** has been permanently deleted.\n\n` +
        `Returning to plans management...`,
    );

    // Return to plans management after 2 seconds
    setTimeout(async () => {
      await handleSubscriptionPlansManagement(chatId, userId);
    }, 2000);
  } catch (error) {
    console.error("Error in handleExecuteDeletePlan:", error);
    await sendMessage(chatId, "❌ Error deleting plan. Please try again.");
  }
}

// Toggle plan lifetime status
export async function handleTogglePlanLifetime(
  chatId: number,
  userId: string,
  planId: string,
): Promise<void> {
  try {
    const { data: plan, error } = await supabaseAdmin
      .from("subscription_plans")
      .select("name, is_lifetime, duration_months")
      .eq("id", planId)
      .single();

    if (error || !plan) {
      await sendMessage(chatId, "❌ Plan not found.");
      return;
    }

    const newLifetimeStatus = !plan.is_lifetime;
    const updateData = {
      is_lifetime: newLifetimeStatus,
      duration_months: newLifetimeStatus ? 0 : (plan.duration_months || 1),
    };

    const { error: updateError } = await supabaseAdmin
      .from("subscription_plans")
      .update(updateData)
      .eq("id", planId);

    if (updateError) {
      console.error("Error updating plan lifetime status:", updateError);
      await sendMessage(
        chatId,
        `❌ Error updating plan: ${updateError.message}`,
      );
      return;
    }

    // Log admin action
    await logAdminAction(
      userId,
      "plan_update",
      `Toggled lifetime status for plan: ${plan.name}`,
      "subscription_plans",
      planId,
      { is_lifetime: plan.is_lifetime },
      { is_lifetime: newLifetimeStatus },
    );

    const statusText = newLifetimeStatus ? "Lifetime" : "Monthly/Yearly";
    await sendMessage(
      chatId,
      `✅ *Plan Updated*\n\n` +
        `**${plan.name}** is now a **${statusText}** plan.\n\n` +
        `Returning to plan details...`,
    );

    // Return to plan editing after 2 seconds
    setTimeout(async () => {
      await handleEditSpecificPlan(chatId, userId, planId);
    }, 2000);
  } catch (error) {
    console.error("Error in handleTogglePlanLifetime:", error);
    await sendMessage(
      chatId,
      "❌ Error toggling plan lifetime status. Please try again.",
    );
  }
}
export async function handleEducationPackagesManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: packages, error: _error } = await supabaseAdmin
      .from("education_packages")
      .select("*, category:education_categories(name)")
      .order("created_at", { ascending: false })
      .limit(10);

    let packageMessage = `🎓 *Education Packages Management*\n\n`;
    packageMessage += `📚 *Current Packages (${packages?.length || 0}):*\n\n`;

    packages?.forEach((pkg: any, index: number) => {
      const status = pkg.is_active ? "✅" : "❌";
      const featured = pkg.is_featured ? "⭐" : "";
      packageMessage += `${index + 1}. ${status}${featured} **${pkg.name}**\n`;
      packageMessage +=
        `   💰 ${pkg.currency} ${pkg.price} (${pkg.duration_weeks} weeks)\n`;
      packageMessage += `   👥 Students: ${pkg.current_students}/${
        pkg.max_students || "∞"
      }\n`;
      packageMessage += `   📅 Created: ${
        new Date(pkg.created_at).toLocaleDateString()
      }\n\n`;
    });

    const packageKeyboard = {
      inline_keyboard: [
        [
          {
            text: "➕ Create Package",
            callback_data: "create_education_package",
          },
          { text: "✏️ Edit Package", callback_data: "edit_education_package" },
        ],
        [
          {
            text: "🗑️ Delete Package",
            callback_data: "delete_education_package",
          },
          {
            text: "📊 Package Stats",
            callback_data: "education_package_stats",
          },
        ],
        [
          {
            text: "🎯 Manage Categories",
            callback_data: "manage_education_categories",
          },
          {
            text: "👥 View Enrollments",
            callback_data: "view_education_enrollments",
          },
        ],
        [
          {
            text: "🔄 Refresh",
            callback_data: "manage_table_education_packages",
          },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, packageMessage, packageKeyboard);
  } catch (error) {
    console.error("Error in education packages management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching education packages. Please try again.",
    );
  }
}

export async function handlePromotionsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: promos, error: _error } = await supabaseAdmin
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    const activeCount = await supabaseAdmin
      .from("promotions")
      .select("count", { count: "exact" })
      .eq("is_active", true);

    let promoMessage = `💰 *Promotions Management*\n\n`;
    promoMessage += `📊 *Statistics:*\n`;
    promoMessage += `• Active Promotions: ${activeCount.count || 0}\n`;
    promoMessage += `• Total Promotions: ${promos?.length || 0}\n\n`;

    promoMessage += `🎁 *Recent Promotions:*\n`;
    promos?.forEach((promo: any, index: number) => {
      const status = promo.is_active ? "🟢" : "🔴";
      const discount = promo.discount_type === "percentage"
        ? `${promo.discount_value}%`
        : `$${promo.discount_value}`;
      promoMessage += `${index + 1}. ${status} **${promo.code}**\n`;
      promoMessage += `   💰 ${discount} ${promo.discount_type}\n`;
      promoMessage += `   📅 Valid until: ${
        new Date(promo.valid_until).toLocaleDateString()
      }\n`;
      promoMessage += `   📈 Used: ${promo.current_uses || 0}/${
        promo.max_uses || "∞"
      }\n\n`;
    });

    const promoKeyboard = {
      inline_keyboard: [
        [
          { text: "➕ Create Promo", callback_data: "create_promotion" },
          { text: "✏️ Edit Promo", callback_data: "edit_promotion" },
        ],
        [
          { text: "🗑️ Delete Promo", callback_data: "delete_promotion" },
          { text: "📊 Promo Analytics", callback_data: "promotion_analytics" },
        ],
        [
          {
            text: "🔄 Toggle Status",
            callback_data: "toggle_promotion_status",
          },
          { text: "📈 Usage Stats", callback_data: "promotion_usage_stats" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_promotions" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, promoMessage, promoKeyboard);
  } catch (error) {
    console.error("Error in promotions management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching promotions data. Please try again.",
    );
  }
}

export async function handleContentManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: content, error } = await supabaseAdmin
      .from("bot_content")
      .select("*")
      .order("content_key", { ascending: true });

    if (error) {
      console.error("Error fetching bot content:", error);
      await sendMessage(
        chatId,
        "❌ Error fetching content data. Please try again.",
      );
      return;
    }

    let contentMessage = `📱 *Bot Content Management*\n\n`;
    contentMessage += `📝 *Editable Content (${
      content?.length || 0
    } items):*\n\n`;

    const contentTypes: Record<string, string> = {
      "welcome_message": "🚀 Welcome Message",
      "about_us": "🏢 About Us",
      "support_message": "🛟 Support Info",
      "terms_conditions": "📋 Terms & Conditions",
      "faq_general": "❓ FAQ Content",
      "maintenance_message": "🔧 Maintenance Notice",
      "vip_benefits": "💎 VIP Benefits",
      "payment_instructions": "💳 Payment Instructions",
      "help_message": "❓ Help Content",
    };

    content?.forEach(
      (
        item: {
          content_key: keyof typeof contentTypes;
          is_active: boolean;
          content_value: string;
          updated_at: string;
        },
        index: number,
      ) => {
        const displayName = contentTypes[item.content_key] ||
          `📄 ${item.content_key}`;
        const status = item.is_active ? "🟢" : "🔴";
        const preview = item.content_value.substring(0, 50) + "...";

        contentMessage += `${index + 1}. ${status} ${displayName}\n`;
        contentMessage += `   📄 Preview: ${preview}\n`;
        contentMessage += `   🕐 Updated: ${
          new Date(item.updated_at).toLocaleDateString()
        }\n\n`;
      },
    );

    const contentKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🚀 Welcome Msg",
            callback_data: "edit_content_welcome_message",
          },
          { text: "🏢 About Us", callback_data: "edit_content_about_us" },
        ],
        [
          { text: "🛟 Support", callback_data: "edit_content_support_message" },
          { text: "📋 Terms", callback_data: "edit_content_terms_conditions" },
        ],
        [
          { text: "❓ FAQ", callback_data: "edit_content_faq_general" },
          {
            text: "🔧 Maintenance",
            callback_data: "edit_content_maintenance_message",
          },
        ],
        [
          {
            text: "💎 VIP Benefits",
            callback_data: "edit_content_vip_benefits",
          },
          {
            text: "💳 Payment Info",
            callback_data: "edit_content_payment_instructions",
          },
        ],
        [
          { text: "➕ Add Content", callback_data: "add_new_content" },
          { text: "👀 Preview All", callback_data: "preview_all_content" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_bot_content" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, contentMessage, contentKeyboard);
  } catch (error) {
    console.error("Error in content management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching content data. Please try again.",
    );
  }
}

export async function handleBotSettingsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: settings, error: _error } = await supabaseAdmin
      .from("bot_settings")
      .select("*")
      .order("setting_key", { ascending: true });

    let settingsMessage = `⚙️ *Bot Settings Management*\n\n`;
    settingsMessage += `🔧 *Current Settings (${
      settings?.length || 0
    } items):*\n\n`;

    const settingTypes: Record<string, string> = {
      "session_timeout_minutes": "🕐 Session Timeout",
      "follow_up_delay_minutes": "📬 Follow-up Delay",
      "max_follow_ups": "🔢 Max Follow-ups",
      "maintenance_mode": "🔧 Maintenance Mode",
      "auto_welcome": "🚀 Auto Welcome",
      "admin_notifications": "🔔 Admin Notifications",
    };

    settings?.forEach(
      (
        setting: {
          setting_key: keyof typeof settingTypes;
          is_active: boolean;
          setting_value: string;
          updated_at: string;
        },
        index: number,
      ) => {
        const displayName = settingTypes[setting.setting_key] ||
          `⚙️ ${setting.setting_key}`;
        const status = setting.is_active ? "🟢" : "🔴";

        settingsMessage += `${index + 1}. ${status} ${displayName}\n`;
        settingsMessage += `   📄 Value: \`${setting.setting_value}\`\n`;
        settingsMessage += `   🕐 Updated: ${
          new Date(setting.updated_at).toLocaleDateString()
        }\n\n`;
      },
    );

    const settingsKeyboard = {
      inline_keyboard: [
        [
          {
            text: "🕐 Session Config",
            callback_data: "config_session_settings",
          },
          {
            text: "📬 Follow-up Setup",
            callback_data: "config_followup_settings",
          },
        ],
        [
          { text: "🔧 Maintenance", callback_data: "toggle_maintenance_mode" },
          { text: "🚀 Auto Features", callback_data: "config_auto_features" },
        ],
        [
          { text: "🔔 Notifications", callback_data: "config_notifications" },
          { text: "⚡ Performance", callback_data: "config_performance" },
        ],
        [
          { text: "➕ Add Setting", callback_data: "add_new_setting" },
          { text: "💾 Backup Config", callback_data: "backup_bot_settings" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_bot_settings" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
        [
          { text: "🚦 Feature Flags", callback_data: "feature_flags" },
        ],
      ],
    };

    await sendMessage(chatId, settingsMessage, settingsKeyboard);
  } catch (error) {
    console.error("Error in bot settings management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching bot settings. Please try again.",
    );
  }
}

export async function handleUserSessionsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: sessions } = await supabaseAdmin
      .from("user_sessions")
      .select("id, telegram_user_id, is_active, last_activity")
      .order("created_at", { ascending: false })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("user_sessions")
      .select("*", { count: "exact", head: true });

    const { count: active } = await supabaseAdmin
      .from("user_sessions")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const sessionMessage = buildMessage("💬 *User Sessions Management*", [
      {
        title: "📊 *Statistics:*",
        items: [
          `Total Sessions: ${total || 0}`,
          `Active Sessions: ${active || 0}`,
        ],
      },
      {
        title: "🕒 *Recent Sessions (Last 10):*",
        items:
          sessions?.map((s: any) =>
            `User: ${s.telegram_user_id} | ${
              s.is_active ? "🟢 Active" : "🔴 Ended"
            }\nLast: ${new Date(s.last_activity).toLocaleString()}`
          ) || [],
        numbered: true,
      },
    ]);

    const sessionKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_user_sessions" },
          { text: "➕ Create", callback_data: "create_user_session" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_user_session" },
          { text: "🗑️ Delete", callback_data: "delete_user_session" },
        ],
        [{ text: "📤 Export", callback_data: "export_user_sessions" }],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_user_sessions" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, sessionMessage, sessionKeyboard);
  } catch (error) {
    console.error("Error in user sessions management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching user session data. Please try again.",
    );
  }
}

export async function handlePaymentsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: payments } = await supabaseAdmin
      .from("payments")
      .select("id, amount, currency, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("payments")
      .select("*", { count: "exact", head: true });

    const { count: completed } = await supabaseAdmin
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const paymentMessage = buildMessage("💳 *Payments Management*", [
      {
        title: "📊 *Statistics:*",
        items: [
          `Total Payments: ${total || 0}`,
          `Completed Payments: ${completed || 0}`,
        ],
      },
      {
        title: "💸 *Recent Payments (Last 10):*",
        items:
          payments?.map((p: any) =>
            `#${p.id} - ${p.currency || ""} ${p.amount} (${p.status})\n${
              new Date(p.created_at).toLocaleDateString()
            }`
          ) || [],
        numbered: true,
      },
    ]);

    const paymentKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_payments" },
          { text: "➕ Create", callback_data: "create_payment" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_payment" },
          { text: "🗑️ Delete", callback_data: "delete_payment" },
        ],
        [{ text: "📤 Export", callback_data: "export_payments" }],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_payments" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, paymentMessage, paymentKeyboard);
  } catch (error) {
    console.error("Error in payments management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching payment data. Please try again.",
    );
  }
}

export async function handleBroadcastMessagesManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: messages } = await supabaseAdmin
      .from("broadcast_messages")
      .select("id, title, delivery_status, scheduled_at, sent_at")
      .order("created_at", { ascending: false })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("broadcast_messages")
      .select("*", { count: "exact", head: true });

    const { count: scheduled } = await supabaseAdmin
      .from("broadcast_messages")
      .select("*", { count: "exact", head: true })
      .eq("delivery_status", "scheduled");

    const broadcastMessage = buildMessage(
      "📢 *Broadcast Messages Management*",
      [
        {
          title: "📊 *Statistics:*",
          items: [
            `Total Messages: ${total || 0}`,
            `Scheduled Messages: ${scheduled || 0}`,
          ],
        },
        {
          title: "📝 *Recent Messages (Last 10):*",
          items:
            messages?.map((m: any) =>
              `${m.title} - ${m.delivery_status}\nScheduled: ${
                m.scheduled_at
                  ? new Date(m.scheduled_at).toLocaleString()
                  : "N/A"
              }`
            ) || [],
          numbered: true,
        },
      ],
    );

    const broadcastKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_broadcast_messages" },
          { text: "➕ Create", callback_data: "create_broadcast_message" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_broadcast_message" },
          { text: "🗑️ Delete", callback_data: "delete_broadcast_message" },
        ],
        [{ text: "📤 Export", callback_data: "export_broadcast_messages" }],
        [
          {
            text: "🔄 Refresh",
            callback_data: "manage_table_broadcast_messages",
          },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, broadcastMessage, broadcastKeyboard);
  } catch (error) {
    console.error("Error in broadcast messages management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching broadcast data. Please try again.",
    );
  }
}

export async function handleBankAccountsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: accounts } = await supabaseAdmin
      .from("bank_accounts")
      .select("id, bank_name, account_name, account_number, currency, is_active")
      .order("display_order", { ascending: true })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("bank_accounts")
      .select("*", { count: "exact", head: true });

    const { count: active } = await supabaseAdmin
      .from("bank_accounts")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const accountsMessage = buildMessage("🏦 *Bank Accounts Management*", [
      {
        title: "📊 *Statistics:*",
        items: [
          `Total Accounts: ${total || 0}`,
          `Active Accounts: ${active || 0}`,
        ],
      },
      {
        title: "🏦 *Recent Accounts:*",
        items:
          accounts?.map((a: any) =>
            `${a.bank_name} - ${a.currency} ${a.account_number.slice(-4)} ${
              a.is_active ? "🟢" : "🔴"
            }`
          ) || [],
        numbered: true,
      },
    ]);

    const accountsKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_bank_accounts" },
          { text: "➕ Create", callback_data: "create_bank_account" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_bank_account" },
          { text: "🗑️ Delete", callback_data: "delete_bank_account" },
        ],
        [{ text: "📤 Export", callback_data: "export_bank_accounts" }],
        [
          { text: "🔄 Refresh", callback_data: "manage_table_bank_accounts" },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, accountsMessage, accountsKeyboard);
  } catch (error) {
    console.error("Error in bank accounts management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching bank account data. Please try again.",
    );
  }
}

export async function handleAutoReplyTemplatesManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: templates } = await supabaseAdmin
      .from("auto_reply_templates")
      .select("id, name, trigger_type, is_active, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("auto_reply_templates")
      .select("*", { count: "exact", head: true });

    const { count: active } = await supabaseAdmin
      .from("auto_reply_templates")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const templateMessage = buildMessage(
      "📝 *Auto Reply Templates Management*",
      [
        {
          title: "📊 *Statistics:*",
          items: [
            `Total Templates: ${total || 0}`,
            `Active Templates: ${active || 0}`,
          ],
        },
        {
          title: "📝 *Recent Templates (Last 10):*",
          items:
            templates?.map((t: any) =>
              `${t.name} (${t.trigger_type}) ${
                t.is_active ? "🟢" : "🔴"
              }\nUpdated: ${
                new Date(t.updated_at).toLocaleDateString()
              }`
            ) || [],
          numbered: true,
        },
      ],
    );

    const templateKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_auto_reply_templates" },
          { text: "➕ Create", callback_data: "create_auto_reply_template" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_auto_reply_template" },
          { text: "🗑️ Delete", callback_data: "delete_auto_reply_template" },
        ],
        [{ text: "📤 Export", callback_data: "export_auto_reply_templates" }],
        [
          {
            text: "🔄 Refresh",
            callback_data: "manage_table_auto_reply_templates",
          },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, templateMessage, templateKeyboard);
  } catch (error) {
    console.error("Error in auto reply templates management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching template data. Please try again.",
    );
  }
}

export async function handleDailyAnalyticsManagement(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const { data: analytics } = await supabaseAdmin
      .from("daily_analytics")
      .select("date, revenue, new_users, total_users")
      .order("date", { ascending: false })
      .limit(10);

    const { count: total } = await supabaseAdmin
      .from("daily_analytics")
      .select("*", { count: "exact", head: true });

    const latestRevenue = analytics?.[0]?.revenue || 0;

    const analyticsMessage = buildMessage("📈 *Daily Analytics Management*", [
      {
        title: "📊 *Statistics:*",
        items: [
          `Total Days: ${total || 0}`,
          `Latest Revenue: ${latestRevenue}`,
        ],
      },
      {
        title: "📆 *Recent Entries (Last 10):*",
        items:
          analytics?.map((a: any) =>
            `${a.date} - Revenue: ${a.revenue ?? 0} | New Users: ${
              a.new_users ?? 0
            }`
          ) || [],
        numbered: true,
      },
    ]);

    const analyticsKeyboard = {
      inline_keyboard: [
        [
          { text: "👁️ View", callback_data: "view_daily_analytics" },
          { text: "➕ Create", callback_data: "create_daily_analytics" },
        ],
        [
          { text: "✏️ Edit", callback_data: "edit_daily_analytics" },
          { text: "🗑️ Delete", callback_data: "delete_daily_analytics" },
        ],
        [{ text: "📤 Export", callback_data: "export_daily_analytics" }],
        [
          {
            text: "🔄 Refresh",
            callback_data: "manage_table_daily_analytics",
          },
          { text: "🔙 Back", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, analyticsMessage, analyticsKeyboard);
  } catch (error) {
    console.error("Error in daily analytics management:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching analytics data. Please try again.",
    );
  }
}

// Quick stats overview for all tables
export async function handleTableStatsOverview(
  chatId: number,
  _userId: string,
): Promise<void> {
  try {
    const tables = [
      "bot_users",
      "subscription_plans",
      "education_packages",
      "promotions",
      "bot_content",
      "bot_settings",
      "user_sessions",
      "payments",
      "broadcast_messages",
      "daily_analytics",
      "user_interactions",
    ];

    let statsMessage = `📊 *Database Overview & Statistics*\n\n`;

    for (const table of tables) {
      try {
        const { count } = await supabaseAdmin
          .from(table)
          .select("count", { count: "exact" });

        const tableEmoji = {
          "bot_users": "👥",
          "subscription_plans": "💎",
          "education_packages": "🎓",
          "promotions": "💰",
          "bot_content": "📱",
          "bot_settings": "⚙️",
          "user_sessions": "💬",
          "payments": "💳",
          "broadcast_messages": "📢",
          "daily_analytics": "📈",
          "user_interactions": "🎯",
        }[table] || "📊";

        const tableName = table.replace(/_/g, " ").replace(
          /\b\w/g,
          (l) => l.toUpperCase(),
        );
        statsMessage += `${tableEmoji} **${tableName}**: ${
          count || 0
        } records\n`;
      } catch (error) {
        console.error(`Error fetching count for ${table}:`, error);
      }
    }

    statsMessage += `\n🕐 *Last Updated*: ${new Date().toLocaleString()}\n`;
    statsMessage += `🔄 *Auto-refresh every 5 minutes*`;

    const statsKeyboard = {
      inline_keyboard: [
        [
          { text: "🔄 Refresh Stats", callback_data: "table_stats_overview" },
          {
            text: "📊 Detailed Analytics",
            callback_data: "detailed_analytics",
          },
        ],
        [
          { text: "💾 Export Summary", callback_data: "export_stats_summary" },
          { text: "📈 Growth Report", callback_data: "growth_report" },
        ],
        [
          { text: "🔙 Back to Tables", callback_data: "manage_tables" },
        ],
      ],
    };

    await sendMessage(chatId, statsMessage, statsKeyboard);
  } catch (error) {
    console.error("Error in table stats overview:", error);
    await sendMessage(
      chatId,
      "❌ Error fetching database statistics. Please try again.",
    );
  }
}

// Basic admin utilities
export function handlePing() {
  return { pong: true };
}

export function handleVersion() {
  return { version: optionalEnv("BOT_VERSION") || "unknown" };
}

export async function handleEnvStatus() {
  const base = requireEnv([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
  ]);
  const secret = await expectedSecret();
  return { ...base, TELEGRAM_WEBHOOK_SECRET: secret ? true : false };
}

export async function handleReviewList() {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("receipts")
    .select("*")
    .eq("verdict", "manual_review")
    .order("created_at", { ascending: false })
    .limit(10);
  return data || [];
}

export function handleReplay(receiptId: string) {
  // Placeholder for reprocessing a receipt
  return { ok: true, receiptId };
}

export async function handleWebhookInfo() {
  if (!BOT_TOKEN) return {};
  const res = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`,
  );
  return await res.json();
}

// --- Feature Flag Management ---
const FLAG_LABELS: Record<string, string> = {
  payments_enabled: "Payments",
  vip_sync_enabled: "VIP Sync",
  broadcasts_enabled: "Broadcasts",
  mini_app_enabled: "Mini App",
};

function buildFlagMessage(flags: Record<string, boolean>): string {
  let msg = "🚦 *Feature Flags*\n\n";
  for (const [key, label] of Object.entries(FLAG_LABELS)) {
    const state = flags[key] ? "🟢 ON" : "🔴 OFF";
    msg += `${state} - ${label}\n`;
  }
  return msg;
}

export async function handleFeatureFlags(
  chatId: number,
  _userId: string,
): Promise<void> {
  const draft = await preview();
  const flags: Record<string, boolean> = { ...draft.data };
  const keyboardRows = Object.keys(FLAG_LABELS).map((name) => [{
    text: (flags[name] ? "ON " : "OFF ") + FLAG_LABELS[name],
    callback_data: `toggle_flag_${name}`,
  }]);
  keyboardRows.push([
    { text: "👁 PREVIEW", callback_data: "preview_flags" },
    { text: "🚀 PUBLISH", callback_data: "publish_flags" },
  ]);
  keyboardRows.push([
    { text: "↩️ ROLLBACK", callback_data: "rollback_flags" },
    { text: "🔄 Refresh", callback_data: "feature_flags" },
  ]);
  keyboardRows.push([
    { text: "⬅️ Home", callback_data: "manage_table_bot_settings" },
  ]);
  await sendMessage(chatId, buildFlagMessage(flags), {
    inline_keyboard: keyboardRows,
  });
}

export async function handleToggleFeatureFlag(
  chatId: number,
  _userId: string,
  flag: string,
): Promise<void> {
  const draft = await preview();
  const current = !!draft.data[flag];
  await setFlag(flag, !current);
  await handleFeatureFlags(chatId, _userId);
}

export async function handlePublishFlagsRequest(chatId: number): Promise<void> {
  const keyboard = {
    inline_keyboard: [[
      { text: "✅ Confirm", callback_data: "publish_flags_confirm" },
      { text: "❌ Cancel", callback_data: "feature_flags" },
    ]],
  };
  await sendMessage(chatId, "Publish feature flags?", keyboard);
}

export async function handlePublishFlagsConfirm(
  chatId: number,
  userId: string,
): Promise<void> {
  await publishFlags(chatId, userId);
  await handleFeatureFlags(chatId, userId);
}

export async function handleRollbackFlagsRequest(
  chatId: number,
): Promise<void> {
  const keyboard = {
    inline_keyboard: [[
      { text: "✅ Confirm", callback_data: "rollback_flags_confirm" },
      { text: "❌ Cancel", callback_data: "feature_flags" },
    ]],
  };
  await sendMessage(chatId, "Rollback to previous publish?", keyboard);
}

export async function handleRollbackFlagsConfirm(
  chatId: number,
  userId: string,
): Promise<void> {
  await rollbackFlags(chatId, userId);
  await handleFeatureFlags(chatId, userId);
}
