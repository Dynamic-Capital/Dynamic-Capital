import { checkEnv, optionalEnv } from "../_shared/env.ts";
import { readMiniAppEnv, requireMiniAppEnv } from "../_shared/miniapp.ts";
import { alertAdmins } from "../_shared/alerts.ts";
import { json, mna, ok, oops } from "../_shared/http.ts";
import { validateTelegramHeader } from "../_shared/telegram_secret.ts";
import { version } from "../_shared/version.ts";
import { hashBlob } from "../_shared/hash.ts";
import {
  getActivePromotions,
  getEducationPackages,
  getFormattedVipPackages,
  getVipPackages,
} from "./database-utils.ts";
import { registerHandler } from "../_shared/serve.ts";
import { createClient } from "../_shared/client.ts";
type SupabaseClient = ReturnType<typeof createClient>;
import {
  envOrSetting,
  getContent,
  getContentBatch,
  getCryptoDepositAddress,
  getFlag,
} from "../_shared/config.ts";
import { buildMainMenu, type MenuSection } from "./menu.ts";
import {
  buildAdminCommandHandlers,
  type CommandContext,
  type CommandHandler,
} from "./admin-command-handlers.ts";
import { setCallbackMessageId } from "./admin-handlers/common.ts";
import { recomputeVipForUser } from "../_shared/vip_sync.ts";
import {
  getVipChannels,
  isMemberLike,
  recomputeVipFlag,
} from "../_shared/telegram_membership.ts";
import { askChatGPT } from "./helpers/chatgpt.ts";
import { escapeHtml } from "./helpers/escape.ts";
import { Bot } from "https://deno.land/x/grammy@v1.18.1/mod.ts";
import {
  conversations,
  createConversation,
} from "https://deno.land/x/grammy_conversations@v1.2.0/mod.ts";
import { createThrottler } from "./vendor/grammy_transformer_throttler.ts";
import { ocrTextFromBlob as defaultOcrTextFromBlob } from "./ocr.ts";
import {
  parseBankSlip as defaultParseBankSlip,
  type ParsedSlip,
} from "./bank-parsers.ts";
// Type definition moved inline to avoid import issues
interface Promotion {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  auto_created?: boolean;
  generated_via?: string | null;
  description?: string | null;
  valid_until?: string | null;
  is_active?: boolean | null;
}

interface TelegramMessage {
  chat: { id: number; type?: string };
  from?: {
    id?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  message_id?: number;
  text?: string;
  caption?: string;
  photo?: { file_id: string }[];
  document?: { file_id: string; mime_type?: string };
  reply_to_message?: TelegramMessage;
  [key: string]: unknown;
}

interface TelegramCallback {
  id: string;
  from: { id: number; username?: string };
  data?: string;
  message?: TelegramMessage;
}

interface ChatMemberUpdate {
  chat: { id: number; username?: string };
  from: { id: number };
  new_chat_member?: { status: string; user: { id: number } };
  old_chat_member?: { status: string; user: { id: number } };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
  chat_member?: ChatMemberUpdate;
  my_chat_member?: ChatMemberUpdate;
  [key: string]: unknown;
}

interface PaymentIntent {
  id: string;
  user_id: string;
  method: string;
  status: string;
  expected_amount: number;
  expected_beneficiary_account_last4?: string;
  expected_beneficiary_name?: string;
  created_at: string;
  pay_code?: string | null;
}

const REQUIRED_ENV_KEYS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TELEGRAM_BOT_TOKEN",
] as const;

// Header used by Telegram to authenticate webhook calls
const SECRET_HEADER = "x-telegram-bot-api-secret-token";

const SUPABASE_URL = optionalEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = optionalEnv("SUPABASE_SERVICE_ROLE_KEY");
const BOT_TOKEN = await envOrSetting<string>("TELEGRAM_BOT_TOKEN");
const botUsername = (await envOrSetting<string>("TELEGRAM_BOT_USERNAME")) || "";

// Log connection status on initialization
console.log("[telegram-bot] Initializing with env check:", {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
  hasBotToken: !!BOT_TOKEN,
});

const bot = BOT_TOKEN
  ? new Bot(BOT_TOKEN, {
    botInfo: {
      id: 0,
      is_bot: true,
      first_name: "stub",
      username: botUsername || "stub",
    } as any,
  })
  : null;
if (bot) {
  // Throttler lacks full typings in our vendored stub; cast to satisfy type checks
  bot.api.config.use(createThrottler() as any);
}

// Optional feature flags (currently unused)
const _OPENAI_ENABLED = optionalEnv("OPENAI_ENABLED") === "true";
const _FAQ_ENABLED = optionalEnv("FAQ_ENABLED") === "true";
let supabaseAdmin: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  if (supabaseAdmin) return supabaseAdmin;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const msg = "Missing Supabase credentials";
    console.error(msg);
    throw new Error(msg);
  }
  supabaseAdmin = createClient("service");
  return supabaseAdmin;
}

type AdminHandlers = typeof import("./admin-handlers/index.ts");

let adminHandlers: AdminHandlers | null = null;
async function loadAdminHandlers(): Promise<AdminHandlers> {
  if (!adminHandlers) {
    adminHandlers = await import("./admin-handlers/index.ts");
  }
  return adminHandlers;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const DEFAULT_PARSE_MODE = "HTML";

function normalizeParseMode(parseMode: unknown): string {
  if (typeof parseMode !== "string") {
    return DEFAULT_PARSE_MODE;
  }
  const trimmed = parseMode.trim();
  if (!trimmed) {
    return DEFAULT_PARSE_MODE;
  }
  return trimmed.toLowerCase() === "html" ? "HTML" : trimmed;
}

function shouldEscapeHtml(parseMode: string): boolean {
  return parseMode.toLowerCase() === "html";
}

let ocrTextFromBlobImpl = defaultOcrTextFromBlob;
let parseBankSlipImpl = defaultParseBankSlip;

export function __setReceiptParsingOverrides(overrides: {
  ocrTextFromBlob?: typeof defaultOcrTextFromBlob;
  parseBankSlip?: typeof defaultParseBankSlip;
}): void {
  if (overrides.ocrTextFromBlob) {
    ocrTextFromBlobImpl = overrides.ocrTextFromBlob;
  }
  if (overrides.parseBankSlip) {
    parseBankSlipImpl = overrides.parseBankSlip;
  }
}

export function __resetReceiptParsingOverrides(): void {
  ocrTextFromBlobImpl = defaultOcrTextFromBlob;
  parseBankSlipImpl = defaultParseBankSlip;
}

async function telegramFetch(
  method: string,
  payload: unknown,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(
        `telegramFetch ${method} failed`,
        res.status,
        text.slice(0, 200),
      );
      throw new Error(`Telegram API ${method} error`);
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function sendMessage(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<number | null> {
  if (!BOT_TOKEN) {
    console.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot send message",
    );
    return null;
  }
  try {
    const { parse_mode: rawParseMode, ...rest } = extra;
    const parseMode = normalizeParseMode(rawParseMode);
    const r = await telegramFetch("sendMessage", {
      chat_id: chatId,
      text: shouldEscapeHtml(parseMode) ? escapeHtml(text) : text,
      disable_web_page_preview: true,
      allow_sending_without_reply: true,
      parse_mode: parseMode,
      ...rest,
    });
    const out = await r.json().catch(() => ({}));
    const id = out?.result?.message_id;
    return typeof id === "number" ? id : null;
  } catch (e) {
    console.error("sendMessage error", e);
    return null;
  }
}

async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<number | null> {
  if (!BOT_TOKEN) {
    console.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot edit message",
    );
    return null;
  }
  try {
    const { parse_mode: rawParseMode, ...rest } = extra;
    const parseMode = normalizeParseMode(rawParseMode);
    const r = await telegramFetch("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: shouldEscapeHtml(parseMode) ? escapeHtml(text) : text,
      parse_mode: parseMode,
      ...rest,
    });
    const out = await r.json().catch(() => ({}));
    const id = out?.result?.message_id;
    return typeof id === "number" ? id : null;
  } catch (e) {
    console.error("editMessage error", e);
    return null;
  }
}

async function answerCallbackQuery(
  cbId: string,
  opts: Record<string, unknown> = {},
): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn(
      "TELEGRAM_BOT_TOKEN is not set; cannot answer callback query",
    );
    return;
  }
  try {
    await telegramFetch("answerCallbackQuery", {
      callback_query_id: cbId,
      ...opts,
    });
  } catch (e) {
    console.error("answerCallbackQuery error", e);
  }
}

async function notifyUser(
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  await sendMessage(chatId, text, extra);
}

async function hasMiniApp(): Promise<boolean> {
  const { url, short } = await readMiniAppEnv();
  if (url) return true;
  const bot = await envOrSetting("TELEGRAM_BOT_USERNAME");
  return Boolean(short && bot);
}

export async function sendMiniAppLink(
  chatId: number,
  opts: { silent?: boolean } = {},
): Promise<string | null> {
  const { silent } = opts;
  if (!BOT_TOKEN) return null;
  if (!(await getFlag("mini_app_enabled"))) {
    if (!silent) {
      const msg = await getContent("checkout_unavailable") ??
        "<b>Checkout is currently unavailable.</b>\nPlease try again later.";
      await sendMessage(chatId, msg);
    }
    return null;
  }

  const { url, short } = await readMiniAppEnv();
  const botUser = (await envOrSetting("TELEGRAM_BOT_USERNAME")) || "";
  const btnText = await getContent("miniapp_button_text") ??
    "Open VIP Mini App";
  const prompt = await getContent("miniapp_open_prompt") ??
    "<b>Open the VIP Mini App:</b>";

  if (url) {
    if (!silent) {
      await sendMessage(chatId, prompt, {
        reply_markup: {
          inline_keyboard: [[{ text: btnText, web_app: { url } }]],
        },
      });
    }
    return url;
  }

  if (short && botUser) {
    const deepLink = `https://t.me/${botUser}/${short}`;
    if (!silent) {
      await sendMessage(chatId, prompt, {
        reply_markup: {
          inline_keyboard: [[{ text: btnText, url: deepLink }]],
        },
      });
    }
    return deepLink;
  }

  if (!silent) {
    const msg = await getContent("miniapp_configuring") ??
      "<b>Mini app is being configured.</b>\nPlease try again soon.";
    await sendMessage(chatId, msg);
  }
  return null;
}

export async function sendMiniAppOrBotOptions(chatId: number): Promise<void> {
  const enabled = await getFlag("mini_app_enabled");
  const url = enabled ? await sendMiniAppLink(chatId, { silent: true }) : null;
  const continueText = await getContent("continue_in_bot_button") ??
    "Continue in Bot";
  const miniText = await getContent("miniapp_button_text") ??
    "Open VIP Mini App";
  const inline_keyboard: {
    text: string;
    callback_data?: string;
    web_app?: { url: string };
  }[][] = [
    [{ text: continueText, callback_data: "nav:plans" }],
  ];
  let text: string;
  if (url) {
    inline_keyboard[0].push({ text: miniText, web_app: { url } });
    text = await getContent("choose_continue_prompt") ??
      "<b>Choose how to continue:</b>";
  } else {
    const key = enabled
      ? "miniapp_configure_continue"
      : "checkout_unavailable_continue";
    text = await getContent(key) ??
      (enabled
        ? "<b>Mini app is being configured.</b>\nContinue in bot:"
        : "<b>Checkout is currently unavailable.</b>\nContinue in bot:");
  }
  await notifyUser(chatId, text, {
    reply_markup: { inline_keyboard },
  });
}

export async function handleDashboardPackages(
  chatId: number,
  _userId: string,
): Promise<void> {
  const msg = await getFormattedVipPackages();
  await notifyUser(chatId, msg, { parse_mode: "Markdown" });
}

export async function handleDashboardRedeem(
  chatId: number,
  _userId: string,
): Promise<void> {
  await sendMiniAppOrBotOptions(chatId);
}

export async function handleDashboardHelp(
  chatId: number,
  _userId: string,
): Promise<void> {
  const msg = await getContent("help_message");
  await notifyUser(chatId, msg ?? "Help is coming soon.");
}

async function handleFaqCommand(chatId: number): Promise<void> {
  const faqContent = await getContent("faq_general");
  const { url: miniAppUrl } = await readMiniAppEnv();

  // Enhanced FAQ with structured content
  const faqText = `<b>❓ Frequently Asked Questions</b>

${
    faqContent ?? `<b>Common Questions:</b>

• What is VIP? Premium trading community
• How to join? Choose a plan below  
• Payment methods? Bank transfer or crypto
• Support? Contact us anytime!

💡 Need help? Ask anything!`
  }`;

  // Create interactive buttons
  const keyboard = [];

  // First row: Ask AI and Support
  keyboard.push([
    { text: "🤖 Ask AI", callback_data: "cmd:ask" },
    { text: "💬 Support", callback_data: "nav:support" },
  ]);

  // Second row: Education and Plans
  keyboard.push([
    { text: "📚 Education", callback_data: "cmd:education" },
    { text: "💳 Plans", callback_data: "nav:plans" },
  ]);

  // Third row: Back to Dashboard
  keyboard.push([
    { text: "🏠 Back to Dashboard", callback_data: "nav:dashboard" },
  ]);

  // Add Mini App button if available
  if (miniAppUrl) {
    const miniAppText = await getContent("miniapp_button_text") ??
      "🚀 Open VIP Mini App";
    keyboard.push([{ text: miniAppText, web_app: { url: miniAppUrl } }]);
  }

  await notifyUser(chatId, faqText, {
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleEducationCommand(chatId: number): Promise<void> {
  const pkgs = await getEducationPackages();
  if (pkgs.length === 0) {
    const msg = await getContent("no_education_packages") ??
      "No education packages available.";
    await notifyUser(chatId, msg);
    return;
  }
  let text = "🎓 *Education Packages*\n\n";
  pkgs.forEach((pkg: Record<string, unknown>, idx: number) => {
    const name = (pkg.name as string) ?? `Package ${idx + 1}`;
    const price = pkg.price as number | undefined;
    const currency = (pkg.currency as string) ?? "USD";
    text += `${idx + 1}. ${name} - ${currency} ${price}\n`;
  });
  await notifyUser(chatId, text, { parse_mode: "Markdown" });
}

async function handlePromoCommand(chatId: number): Promise<void> {
  const promos = await getActivePromotions();
  if (promos.length === 0) {
    const msg = await getContent("no_active_promotions") ??
      "No active promotions at the moment.";
    await notifyUser(chatId, msg);
    return;
  }
  let text = "🎁 *Active Promotions*\n\nSelect a promo code:";
  const inline_keyboard = promos.map(
    (p: Record<string, unknown>, idx: number) => {
      const value = p.discount_type === "percentage"
        ? `${p.discount_value}%`
        : `$${p.discount_value}`;
      text += `\n${idx + 1}. ${p.code} - ${value}`;
      return [{ text: String(p.code), callback_data: `promo:${p.code}` }];
    },
  );
  await notifyUser(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard },
  });
}

async function handleAskCommand(ctx: CommandContext): Promise<void> {
  const question = ctx.args.join(" ");
  if (!question) {
    const usage = await getContent("ask_usage") ??
      "Please send a question, e.g. /ask How do I size positions?";
    await notifyUser(ctx.chatId, usage);
    return;
  }
  try {
    const answer = await askChatGPT(question) ??
      (await getContent("ask_no_answer")) ??
      "I couldn't find anything helpful. Try rephrasing or ask /support.";
    await notifyUser(ctx.chatId, answer);
  } catch {
    const msg = await getContent("ask_failed") ??
      "The coaching assistant is unavailable right now. Please try again shortly.";
    await notifyUser(ctx.chatId, msg);
  }
}

async function handleShouldIBuyCommand(ctx: CommandContext): Promise<void> {
  const instrument = ctx.args[0];
  if (!instrument) {
    const usage = await getContent("shouldibuy_usage") ??
      "Please send a symbol, e.g. /shouldibuy XAUUSD.";
    await notifyUser(ctx.chatId, usage);
    return;
  }
  if (!SUPABASE_URL) {
    const msg = await getContent("service_unavailable") ??
      "Service temporarily unavailable. Please try again soon.";
    await notifyUser(ctx.chatId, msg);
    return;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/trade-helper`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instrument, command: "shouldibuy" }),
    });
    const data = await res.json().catch(() => ({}));
    const analysis = data.analysis ??
      (await getContent("shouldibuy_no_analysis")) ??
      "No analysis is available yet. Try again soon or contact /support.";
    await notifyUser(ctx.chatId, analysis, { parse_mode: "Markdown" });
  } catch {
    const msg = await getContent("shouldibuy_failed") ??
      "The analysis desk is offline right now. Please try again shortly.";
    await notifyUser(ctx.chatId, msg);
  }
}

export async function defaultCallbackHandler(
  chatId: number,
  _userId: string,
): Promise<void> {
  const unknown = await getContent("unknown_action") ??
    "Unknown action. Please choose a valid option.";
  await notifyUser(chatId, unknown);
}

export type CallbackHandler = (
  chatId: number,
  userId: string,
) => Promise<void>;

export function buildCallbackHandlers(
  handlers: AdminHandlers,
): Record<string, CallbackHandler> {
  return {
    dashboard_packages: handleDashboardPackages,
    dashboard_redeem: handleDashboardRedeem,
    dashboard_help: handleDashboardHelp,
    admin_dashboard: (chatId, userId) =>
      handlers.handleAdminDashboard(chatId, userId),
    table_management: (chatId, userId) =>
      handlers.handleTableManagement(chatId, userId),
    feature_flags: (chatId, userId) =>
      handlers.handleFeatureFlags(chatId, userId),
    publish_flags: (chatId) => handlers.handlePublishFlagsRequest(chatId),
    publish_flags_confirm: (chatId, userId) =>
      handlers.handlePublishFlagsConfirm(chatId, userId),
    rollback_flags: (chatId) => handlers.handleRollbackFlagsRequest(chatId),
    rollback_flags_confirm: (chatId, userId) =>
      handlers.handleRollbackFlagsConfirm(chatId, userId),
    env_status: async (chatId) => {
      const envStatus = await handlers.handleEnvStatus();
      await notifyUser(chatId, JSON.stringify(envStatus));
    },
    manage_table_bot_users: (chatId, userId) =>
      handlers.handleUserTableManagement(chatId, userId),
    manage_table_subscription_plans: (chatId, userId) =>
      handlers.handleSubscriptionPlansManagement(chatId, userId),
    manage_table_plan_channels: (chatId, userId) =>
      handlers.handlePlanChannelsManagement(chatId, userId),
    manage_table_education_packages: (chatId, userId) =>
      handlers.handleEducationPackagesManagement(chatId, userId),
    manage_table_promotions: (chatId, userId) =>
      handlers.handlePromotionsManagement(chatId, userId),
    manage_table_bot_content: (chatId, userId) =>
      handlers.handleContentManagement(chatId, userId),
    manage_table_bot_settings: (chatId, userId) =>
      handlers.handleBotSettingsManagement(chatId, userId),
    config_session_settings: (chatId, userId) =>
      handlers.handleConfigSessionSettings(chatId, userId),
    config_followup_settings: (chatId, userId) =>
      handlers.handleConfigFollowupSettings(chatId, userId),
    toggle_maintenance_mode: (chatId, userId) =>
      handlers.handleToggleMaintenanceMode(chatId, userId),
    config_auto_features: (chatId, userId) =>
      handlers.handleConfigAutoFeatures(chatId, userId),
    config_notifications: (chatId, userId) =>
      handlers.handleConfigNotifications(chatId, userId),
    config_performance: (chatId, userId) =>
      handlers.handleConfigPerformance(chatId, userId),
    add_new_setting: (chatId, userId) =>
      handlers.handleAddNewSetting(chatId, userId),
    backup_bot_settings: (chatId, userId) =>
      handlers.handleBackupBotSettings(chatId, userId),
    manage_table_daily_analytics: (chatId, userId) =>
      handlers.handleDailyAnalyticsManagement(chatId, userId),
    manage_table_user_sessions: (chatId, userId) =>
      handlers.handleUserSessionsManagement(chatId, userId),
    manage_table_payments: (chatId, userId) =>
      handlers.handlePaymentsManagement(chatId, userId),
    manage_table_broadcast_messages: (chatId, userId) =>
      handlers.handleBroadcastMessagesManagement(chatId, userId),
    manage_table_bank_accounts: (chatId, userId) =>
      handlers.handleBankAccountsManagement(chatId, userId),
    manage_table_auto_reply_templates: (chatId, userId) =>
      handlers.handleAutoReplyTemplatesManagement(chatId, userId),
    manage_table_user_interactions: (chatId, userId) =>
      handlers.handleUserInteractionsManagement(chatId, userId),
    manage_table_channel_memberships: (chatId, userId) =>
      handlers.handleChannelMembershipsManagement(chatId, userId),
    manage_table_media_files: (chatId, userId) =>
      handlers.handleMediaFilesManagement(chatId, userId),
    manage_table_admin_logs: (chatId, userId) =>
      handlers.handleAdminLogsManagement(chatId, userId),
    manage_table_kv_config: (chatId, userId) =>
      handlers.handleKvConfigManagement(chatId, userId),
    manage_table_contact_links: (chatId, userId) =>
      handlers.handleContactLinksManagement(chatId, userId),
    manage_table_abuse_bans: (chatId, userId) =>
      handlers.handleAbuseBansManagement(chatId, userId),
    edit_content_welcome_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "welcome_message"),
    edit_content_about_us: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "about_us"),
    edit_content_support_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "support_message"),
    edit_content_terms_conditions: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "terms_conditions"),
    edit_content_faq_general: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "faq_general"),
    edit_content_maintenance_message: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "maintenance_message"),
    edit_content_vip_benefits: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "vip_benefits"),
    edit_content_payment_instructions: (chatId, userId) =>
      handlers.handleEditContent(chatId, userId, "payment_instructions"),
    add_new_content: (chatId, userId) =>
      handlers.handleAddNewContent(chatId, userId),
    add_contact_link: (chatId, userId) =>
      handlers.handleAddContactLink(chatId, userId),
    edit_contact_link: (chatId, userId) =>
      handlers.handleEditContactLink(chatId, userId),
    toggle_contact_link: (chatId, userId) =>
      handlers.handleToggleContactLink(chatId, userId),
    delete_contact_link: (chatId, userId) =>
      handlers.handleDeleteContactLink(chatId, userId),
    reorder_contact_links: (chatId, userId) =>
      handlers.handleReorderContactLinks(chatId, userId),
    vip_sync_management: (chatId, userId) =>
      handlers.handleVipSyncManagement(chatId, userId),
    vip_full_sync: (chatId, userId) =>
      handlers.handleVipFullSync(chatId, userId),
    vip_assign_lifetime: (chatId, userId) =>
      handlers.handleVipAssignLifetime(chatId, userId),
    vip_assign_lifetime_confirm: (chatId, userId) =>
      handlers.handleVipAssignLifetimeConfirm(chatId, userId),
    vip_sync_single: (chatId, userId) =>
      handlers.handleVipSyncSingle(chatId, userId),
    vip_view_status: (chatId, userId) =>
      handlers.handleVipViewStatus(chatId, userId),
    vip_configure_channels: (chatId, userId) =>
      handlers.handleVipConfigureChannels(chatId, userId),
    github_cleanup: (chatId, userId) =>
      handlers.handleGitHubCleanup(chatId, userId),
    github_analyze: (chatId, userId) =>
      handlers.handleGitHubAnalyze(chatId, userId),
    github_status: (chatId, userId) =>
      handlers.handleGitHubStatus(chatId, userId),
    github_structure: (chatId, userId) =>
      handlers.handleGitHubStructure(chatId, userId),
    github_cleanup_confirm: (chatId, userId) =>
      handlers.handleGitHubCleanupConfirm(chatId, userId),
    github_cleanup_execute: (chatId, userId) =>
      handlers.handleGitHubCleanupExecute(chatId, userId),
    preview_all_content: (chatId, userId) =>
      handlers.handlePreviewAllContent(chatId, userId),
    export_all_tables: (chatId, userId) =>
      handlers.handleExportAllTables(chatId, userId),
    table_stats_overview: (chatId, userId) =>
      handlers.handleTableStatsOverview(chatId, userId),
  };
}

function getDynamicCallbackHandler(
  data: string,
  handlers: AdminHandlers,
): CallbackHandler | null {
  if (data.startsWith("edit_plan_price_")) {
    const id = data.slice("edit_plan_price_".length);
    return (chatId, userId) => handlers.handleEditPlanPrice(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_name_")) {
    const id = data.slice("edit_plan_name_".length);
    return (chatId, userId) => handlers.handleEditPlanName(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_duration_")) {
    const id = data.slice("edit_plan_duration_".length);
    return (chatId, userId) =>
      handlers.handleEditPlanDuration(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_features_")) {
    const id = data.slice("edit_plan_features_".length);
    return (chatId, userId) =>
      handlers.handleEditPlanFeatures(chatId, userId, id);
  }
  if (data === "auto_generate_promo") {
    return (chatId, userId) => handlers.handleAutoGeneratePromo(chatId, userId);
  }
  if (data.startsWith("toggle_plan_lifetime_")) {
    const id = data.slice("toggle_plan_lifetime_".length);
    return (chatId, userId) =>
      handlers.handleTogglePlanLifetime(chatId, userId, id);
  }
  if (data.startsWith("add_plan_feature_")) {
    const id = data.slice("add_plan_feature_".length);
    return (chatId, userId) =>
      handlers.handleAddPlanFeature(chatId, userId, id);
  }
  if (data.startsWith("remove_plan_feature_")) {
    const id = data.slice("remove_plan_feature_".length);
    return (chatId, userId) =>
      handlers.handleRemovePlanFeature(chatId, userId, id);
  }
  if (data.startsWith("replace_plan_features_")) {
    const id = data.slice("replace_plan_features_".length);
    return (chatId, userId) =>
      handlers.handleReplacePlanFeatures(chatId, userId, id);
  }
  if (data.startsWith("confirm_delete_plan_")) {
    const id = data.slice("confirm_delete_plan_".length);
    return (chatId, userId) =>
      handlers.handleConfirmDeletePlan(chatId, userId, id);
  }
  if (data.startsWith("delete_plan_confirmed_")) {
    const id = data.slice("delete_plan_confirmed_".length);
    return (chatId, userId) =>
      handlers.handleExecuteDeletePlan(chatId, userId, id);
  }
  if (data.startsWith("edit_plan_")) {
    const id = data.slice("edit_plan_".length);
    return (chatId, userId) =>
      handlers.handleEditSpecificPlan(chatId, userId, id);
  }
  if (data.startsWith("edit_contact_")) {
    const id = data.slice("edit_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "edit", id);
  }
  if (data.startsWith("toggle_contact_")) {
    const id = data.slice("toggle_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "toggle", id);
  }
  if (data.startsWith("delete_contact_")) {
    const id = data.slice("delete_contact_".length);
    return (chatId, userId) =>
      handlers.processContactLinkOperation(chatId, userId, "delete", id);
  }
  return null;
}

async function menuView(
  section: MenuSection,
): Promise<{ text: string; extra: Record<string, unknown> }> {
  if (section === "plans") {
    const [msg, pkgs] = await Promise.all([
      getFormattedVipPackages(),
      getVipPackages(),
    ]);
    const inline_keyboard = pkgs.map((pkg) => [{
      text: pkg.name,
      callback_data: "buy:" + pkg.id,
    }]);
    inline_keyboard.push([{ text: "Back", callback_data: "nav:dashboard" }]);
    return {
      text: msg,
      extra: { reply_markup: { inline_keyboard }, parse_mode: "Markdown" },
    };
  }
  if (section === "support") {
    const contactLinks = await fetchActiveContactLinks();
    const supportMessage = await getContent("support_message") ??
      `🛟 Need Help?

Our support team is here for you!

${contactLinks}

🕐 Support Hours: 24/7
We typically respond within 2-4 hours.

Route inquiries or marketing requests to the channels listed above.`;

    return {
      text: supportMessage,
      extra: {
        reply_markup: await buildMainMenu(section),
        parse_mode: "HTML",
      },
    };
  }
  const markup = await buildMainMenu(section) as {
    inline_keyboard: {
      text: string;
      callback_data?: string;
      web_app?: { url: string };
    }[][];
  };
  const { url } = await readMiniAppEnv();
  const miniText = await getContent("miniapp_button_text") ??
    "Open VIP Mini App";
  if (url) {
    markup.inline_keyboard.push([{ text: miniText, web_app: { url } }]);
  }
  const msg = await getContent("welcome_message");
  return {
    text: msg ??
      "Welcome to Dynamic Capital! Choose how you'd like to continue:",
    extra: { reply_markup: markup, parse_mode: "Markdown" },
  };
}

async function getMenuMessageId(chatId: number): Promise<number | null> {
  try {
    const supa = getSupabase();
    const { data } = await supa
      .from("bot_users")
      .select("menu_message_id")
      .eq("telegram_id", chatId)
      .maybeSingle();
    return data?.menu_message_id ?? null;
  } catch (e) {
    console.error("getMenuMessageId error", e);
    return null;
  }
}

async function setMenuMessageId(
  chatId: number,
  messageId: number | null,
): Promise<void> {
  try {
    const supa = getSupabase();
    await supa
      .from("bot_users")
      .update({ menu_message_id: messageId })
      .eq("telegram_id", chatId);
  } catch {
    /* ignore */
  }
}

async function sendMainMenu(
  chatId: number,
  section: MenuSection = "dashboard",
): Promise<number | null> {
  const view = await menuView(section);
  const msgId = await sendMessage(chatId, view.text, view.extra);
  if (msgId !== null) {
    await setMenuMessageId(chatId, msgId);
  }
  return msgId;
}

async function showMainMenu(
  chatId: number,
  section: MenuSection = "dashboard",
): Promise<void> {
  const existing = await getMenuMessageId(chatId);
  const view = await menuView(section);
  if (existing) {
    const newId = await editMessage(chatId, existing, view.text, view.extra);
    if (newId !== null) {
      await setMenuMessageId(chatId, newId);
    } else {
      await setMenuMessageId(chatId, null);
      await sendMainMenu(chatId, section);
    }
  } else {
    await sendMainMenu(chatId, section);
  }
}

async function extractTelegramUpdate(
  req: Request,
): Promise<TelegramUpdate | null> {
  try {
    return await req.json() as TelegramUpdate;
  } catch {
    return null;
  }
}

function isDirectMessage(msg: TelegramMessage | undefined): boolean {
  if (!msg) return false;
  const chatType = msg.chat.type;
  if (chatType === "private") return true;
  const bot = botUsername.toLowerCase();
  if (bot) {
    const text = `${msg.text ?? ""} ${msg.caption ?? ""}`.toLowerCase();
    if (text.includes(`@${bot}`)) return true;
    const replyUser = msg.reply_to_message?.from?.username?.toLowerCase();
    if (replyUser === bot) return true;
  }
  return false;
}

function getFileIdFromUpdate(update: TelegramUpdate | null): string | null {
  const msg = update?.message;
  if (!msg) return null;
  if (Array.isArray(msg.photo) && msg.photo.length > 0) {
    return msg.photo[msg.photo.length - 1].file_id;
  }
  const doc = msg.document;
  if (
    doc &&
    (!doc.mime_type || doc.mime_type.startsWith("image/"))
  ) {
    return doc.file_id;
  }
  return null;
}

function isStartMessage(m: TelegramMessage | undefined) {
  const t = m?.text ?? "";
  if (t.startsWith("/start")) return true;
  const ents = m?.entities as
    | { offset: number; length: number; type: string }[]
    | undefined;
  return Array.isArray(ents) && ents.some((e) =>
    e.type === "bot_command" &&
    t.slice(e.offset, e.offset + e.length).startsWith("/start")
  );
}

function supaSvc() {
  return getSupabase();
}

/** Persist one interaction for analytics. */
async function logInteraction(
  kind: string,
  telegramUserId: string,
  extra: unknown = null,
): Promise<void> {
  try {
    const supa = supaSvc();
    await supa.from("user_interactions").insert({
      telegram_user_id: telegramUserId,
      interaction_type: kind,
      interaction_data: extra,
      page_context: "telegram-bot",
    });
  } catch {
    /* swallow */
  }
}

/** Simple per-user RPM limit using Supabase RPC (resets every minute). */
async function enforceRateLimit(tgId: string): Promise<null | Response> {
  try {
    const limit = Number((await envOrSetting("RATE_LIMIT_PER_MINUTE")) ?? "20");
    const { error } = await supaSvc().rpc("rl_touch", {
      _tg: tgId,
      _limit: limit,
    });
    if (
      error &&
      (error.message === "rate_limited" ||
        (error as { details?: string }).details === "rate_limited")
    ) {
      const msg = await getContent("rate_limit_exceeded") ??
        "Too Many Requests";
      return json({ ok: false, error: msg }, 429);
    }
  } catch {
    // Ignore rate limit failures when Supabase is unavailable
    return null;
  }
  return null;
}

async function storeReceiptImage(
  blob: Blob,
  storagePath: string,
): Promise<string> {
  try {
    const supabase = getSupabase();
    const result = await supabase.storage
      .from("payment-receipts")
      .upload(storagePath, blob, { contentType: blob.type || undefined });
    const error = result?.error;
    if (error) {
      console.error("storeReceiptImage upload error", error);
      throw error;
    }
    return storagePath;
  } catch (e) {
    console.error("storeReceiptImage error", e);
    throw e;
  }
}

/** Ensure bot user exists and report whether this is a new user */
async function ensureBotUserExists(
  telegramUserId: string,
  firstName?: string,
  lastName?: string,
  username?: string,
): Promise<{ created: boolean }> {
  try {
    const supa = getSupabase();
    // Check if user exists
    const { data: existingUser } = await supa
      .from("bot_users")
      .select("id, telegram_id")
      .eq("telegram_id", telegramUserId)
      .maybeSingle();

    if (existingUser) {
      // User exists, update their info if provided
      if (firstName || lastName || username) {
        await supa
          .from("bot_users")
          .update({
            first_name: firstName,
            last_name: lastName,
            username: username,
            updated_at: new Date().toISOString(),
          })
          .eq("telegram_id", telegramUserId);
      }
      return { created: false };
    }

    // Create new user
    await supa.from("bot_users").insert({
      telegram_id: telegramUserId,
      first_name: firstName,
      last_name: lastName,
      username: username,
    });

    return { created: true };
  } catch (error) {
    console.error("Error in ensureBotUserExists:", error);
    throw error;
  }
}

/** Fetch active contact links from database */
async function fetchActiveContactLinks(): Promise<string> {
  try {
    const supa = getSupabase();
    const { data: links } = await supa
      .from("contact_links")
      .select("platform, display_name, url, icon_emoji")
      .eq("is_active", true)
      .order("display_order");

    if (!links || links.length === 0) {
      return [
        "📧 Inquiries: hello@dynamiccapital.ton",
        "🛟 Support: support@dynamiccapital.ton",
        "📣 Marketing: marketing@dynamiccapital.ton",
        "💬 Telegram: https://t.me/DynamicCapital_Support",
        "🌐 Website: https://dynamiccapital.com",
        "📸 Instagram: https://www.instagram.com/dynamic.capital/",
        "📘 Facebook: https://www.facebook.com/dynamic.capital.fb/",
        "📊 TradingView: https://www.tradingview.com/u/DynamicCapital-FX/",
        "🎵 TikTok: https://www.tiktok.com/@dynamic.capital.mv/",
      ].join("\n");
    }

    return links
      .map((link: {
        platform: string;
        display_name: string;
        url: string;
        icon_emoji?: string;
      }) => `${link.icon_emoji || "🔗"} ${link.display_name}: ${link.url}`)
      .join("\n");
  } catch (error) {
    console.error("Error fetching contact links:", error);
    return [
      "📧 Inquiries: hello@dynamiccapital.ton",
      "🛟 Support: support@dynamiccapital.ton",
      "📣 Marketing: marketing@dynamiccapital.ton",
      "💬 Telegram: https://t.me/DynamicCapital_Support",
      "🌐 Website: https://dynamiccapital.com",
      "📸 Instagram: https://www.instagram.com/dynamic.capital/",
      "📘 Facebook: https://www.facebook.com/dynamic.capital.fb/",
      "📊 TradingView: https://www.tradingview.com/u/DynamicCapital-FX/",
      "🎵 TikTok: https://www.tiktok.com/@dynamic.capital.mv/",
    ].join("\n");
  }
}

async function handleMembershipUpdate(update: TelegramUpdate): Promise<void> {
  const cm = update.chat_member ?? update.my_chat_member;
  if (!cm) return;
  const supa = supaSvc();
  const userId = String(cm.new_chat_member?.user?.id ?? cm.from?.id ?? "");
  if (!userId) return;
  const chatId = String(cm.chat.id);
  const chatUsername = cm.chat.username ? `@${cm.chat.username}` : null;
  const channels = await getVipChannels(supa);
  const isVipChannel = channels.includes(chatId) ||
    (chatUsername ? channels.includes(chatUsername) : false);
  if (!isVipChannel) return;
  const status = cm.new_chat_member?.status ?? null;
  const active = isMemberLike(status);
  await supa.from("channel_memberships").upsert({
    telegram_user_id: userId,
    channel_id: chatId,
    is_active: active,
    updated_at: new Date().toISOString(),
  }, { onConflict: "telegram_user_id,channel_id" });
  const grace = Number(optionalEnv("VIP_EXPIRY_GRACE_DAYS") || "0");
  await recomputeVipFlag(supa, userId, grace);
  try {
    await supa.from("admin_logs").insert({
      action_type: "vip_sync_update",
      telegram_user_id: userId,
      action_description: `${active ? "join" : "leave"}:${chatId}`,
    });
  } catch {
    /* ignore */
  }
}

export const commandHandlers: Record<string, CommandHandler> = {
  "/start": async ({ chatId, msg }) => {
    const telegramUserId = String(chatId);
    const firstName = msg?.from?.first_name;
    const lastName = msg?.from?.last_name;
    const username = msg?.from?.username;

    // Ensure user exists
    let isNewUser = false;
    try {
      const result = await ensureBotUserExists(
        telegramUserId,
        firstName,
        lastName,
        username,
      );
      isNewUser = result.created;
    } catch (error) {
      console.error("ensureBotUserExists error", error);
    }

    // Get welcome message with improved default
    const welcomeMessage = await getContent("welcome_message") ??
      `👋 <b>Welcome to Dynamic Capital!</b>

🚀 Premium signals &amp; expert guidance
✅ Smart risk management  
🤝 Join thousands of successful traders

<b>What would you like to do?</b>`;

    // Get current Mini App configuration
    const { url } = await readMiniAppEnv();
    const continueText = await getContent("continue_in_bot_button") ??
      "Continue in Bot";
    const miniText = await getContent("miniapp_button_text") ??
      "🚀 Open VIP Mini App";

    // Build enhanced keyboard
    const keyboard: {
      text: string;
      callback_data?: string;
      web_app?: { url: string };
    }[][] = [
      [{ text: continueText, callback_data: "nav:dashboard" }],
    ];

    // Always add Mini App button since readMiniAppEnv now auto-derives URL
    if (url) {
      keyboard[0].push({ text: miniText, web_app: { url } });
    }

    // Add popular actions
    keyboard.push([
      { text: "💳 Plans", callback_data: "nav:plans" },
      { text: "📦 Packages", callback_data: "cmd:education" },
    ]);

    // Add utility actions
    keyboard.push([
      { text: "🎁 Promo", callback_data: "cmd:promo" },
      { text: "👤 Account", callback_data: "nav:dashboard" },
      { text: "❓ FAQ", callback_data: "cmd:faq" },
    ]);

    // Add advanced actions
    keyboard.push([
      { text: "📚 Education", callback_data: "cmd:education" },
      { text: "🤔 Should I Buy?", callback_data: "cmd:shouldibuy" },
      { text: "💬 Support", callback_data: "nav:support" },
    ]);

    await sendMessage(chatId, welcomeMessage, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: "HTML",
    });

    await logInteraction(
      isNewUser ? "new_user_start" : "returning_user_start",
      telegramUserId,
    );
  },
  "/app": async ({ chatId }) => {
    await showMainMenu(chatId, "dashboard");
  },
  "/plans": async ({ chatId }) => {
    await showMainMenu(chatId, "plans");
  },
  "/packages": async ({ chatId }) => {
    await showMainMenu(chatId, "plans");
  },
  "/account": async ({ chatId }) => {
    await showMainMenu(chatId, "dashboard");
  },
  "/support": async ({ chatId }) => {
    await showMainMenu(chatId, "support");
  },
  "/contact": async ({ chatId }) => {
    const contactLinks = await fetchActiveContactLinks();
    const contactMessage = await getContent("contact_message") ??
      `💬 Contact Dynamic Capital Support

${contactLinks}

🕐 Support Hours: 24/7
📞 We typically respond within 2-4 hours

Route inquiries, support tickets, or marketing campaigns to the channel that fits best.

How can we help you today?`;

    await sendMessage(chatId, contactMessage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Back to Dashboard", callback_data: "nav:dashboard" }],
        ],
      },
    });
  },
  "/help": async ({ chatId }) => {
    await handleDashboardHelp(chatId, String(chatId));
  },
  "/faq": async ({ chatId }) => {
    await handleFaqCommand(chatId);
  },
  "/education": async ({ chatId }) => {
    await handleEducationCommand(chatId);
  },
  "/promo": async ({ chatId }) => {
    await handlePromoCommand(chatId);
  },
  "/ask": async (ctx) => {
    await handleAskCommand(ctx);
  },
  "/shouldibuy": async (ctx) => {
    await handleShouldIBuyCommand(ctx);
  },
};

// Admin command handlers are built separately to keep user logic light
const adminCommandHandlers = buildAdminCommandHandlers(
  loadAdminHandlers,
  (chatId, text) => notifyUser(chatId, text),
);

async function handleCommand(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const userId = String(msg.from?.id ?? chatId);
  if (msg.chat.type === "private" && userId) {
    try {
      await recomputeVipForUser(userId);
    } catch (err) {
      console.error("vip check error", err);
    }
  }
  const text = msg.text?.trim();
  if (!text) return;
  const miniAppValid = await hasMiniApp();

  // Handle pending admin plan edits before command parsing
  const handlers = await loadAdminHandlers();
  if (await handlers.handlePlanEditInput(chatId, userId, text)) return;

  // Extract the command without bot mentions and gather arguments
  const [firstToken, ...args] = text.split(/\s+/);
  let command = firstToken.split("@")[0];
  if (isStartMessage(msg)) command = "/start";

  try {
    const ctx: CommandContext = { msg, chatId, args, miniAppValid };
    const handler = commandHandlers[command] ?? adminCommandHandlers[command];
    if (handler) {
      await handler(ctx);
    }
  } catch (err) {
    console.error("handleCommand error", err);
  }
}

async function handleAddAdminUser(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("user_sessions").upsert({
      telegram_user_id: userId,
      awaiting_input: "add_admin_user",
      is_active: true,
      last_activity: new Date().toISOString(),
    });
    await notifyUser(
      chatId,
      "👤 **Add Admin User**\n\nSend the Telegram User ID to make admin:",
    );
  } catch (error) {
    console.error("Error in handleAddAdminUser:", error);
    await notifyUser(chatId, "❌ Error setting up admin user addition.");
  }
}

async function handleSearchUser(chatId: number, userId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    await supabase.from("user_sessions").upsert({
      telegram_user_id: userId,
      awaiting_input: "search_user",
      is_active: true,
      last_activity: new Date().toISOString(),
    });
    await notifyUser(
      chatId,
      "🔍 **Search User**\n\nSend username, user ID, or name to search:",
    );
  } catch (error) {
    console.error("Error in handleSearchUser:", error);
    await notifyUser(chatId, "❌ Error setting up user search.");
  }
}

async function handleManageVipUsers(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: vipUsers } = await supabase
      .from("bot_users")
      .select("telegram_id, username, first_name, last_name")
      .eq("is_vip", true)
      .limit(10);

    let message = "💎 **VIP Users Management**\n\n";

    if (vipUsers && vipUsers.length > 0) {
      message += "Current VIP Users:\n";
      vipUsers.forEach((user: any, index: number) => {
        const name = user.first_name || user.username || user.telegram_id;
        message += `${index + 1}. ${name} (${user.telegram_id})\n`;
      });
    } else {
      message += "No VIP users found.";
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: "➕ Add VIP", callback_data: "add_vip_user" },
          { text: "➖ Remove VIP", callback_data: "remove_vip_user" },
        ],
        [
          { text: "🔄 Refresh", callback_data: "manage_vip_users" },
          { text: "🔙 Back", callback_data: "manage_table_bot_users" },
        ],
      ],
    };

    await notifyUser(chatId, message, { reply_markup: keyboard });
  } catch (error) {
    console.error("Error in handleManageVipUsers:", error);
    await notifyUser(chatId, "❌ Error fetching VIP users.");
  }
}

async function handleExportUsers(
  chatId: number,
  userId: string,
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: users } = await supabase
      .from("bot_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (!users || users.length === 0) {
      await notifyUser(chatId, "📋 No users found to export.");
      return;
    }

    // Log admin action
    await supabase.from("admin_logs").insert({
      admin_telegram_id: userId,
      action_type: "export_users",
      action_description: `Exported ${users.length} user records`,
      affected_table: "bot_users",
    });

    // Create a simple text summary
    let exportText = `📊 **User Export Summary**\n\n`;
    exportText += `Total Users: ${users.length}\n`;
    exportText += `VIP Users: ${users.filter((u: any) => u.is_vip).length}\n`;
    exportText += `Admin Users: ${
      users.filter((u: any) => u.is_admin).length
    }\n\n`;
    exportText += `Recent Users:\n`;

    users.slice(0, 10).forEach((user: any, index: number) => {
      const name = user.first_name || user.username || "Unknown";
      const status = user.is_vip ? "💎" : user.is_admin ? "👑" : "👤";
      exportText += `${index + 1}. ${status} ${name} (${user.telegram_id})\n`;
    });

    await notifyUser(chatId, exportText);
  } catch (error) {
    console.error("Error in handleExportUsers:", error);
    await notifyUser(chatId, "❌ Error exporting users.");
  }
}

async function handleCallback(update: TelegramUpdate): Promise<void> {
  const cb = update.callback_query;
  if (!cb) return;
  const chatId = cb.message?.chat.id ?? cb.from.id;
  const data = cb.data || "";
  const userId = String(cb.from.id);
  setCallbackMessageId(cb.message?.message_id ?? null);
  try {
    if (data.startsWith("pay:")) {
      await answerCallbackQuery(cb.id);
      await sendMiniAppOrBotOptions(chatId);
      return;
    }
    // Acknowledge other callbacks promptly to avoid client retries
    await answerCallbackQuery(cb.id);
    if (data.startsWith("nav:") && cb.message) {
      const section = data.slice("nav:".length) as MenuSection;
      const view = await menuView(section);
      await editMessage(chatId, cb.message!.message_id!, view.text, view.extra);
      return;
    }
    if (data.startsWith("cmd:")) {
      const cmd = "/" + data.slice("cmd:".length);
      const handler = commandHandlers[cmd] ?? adminCommandHandlers[cmd];
      if (handler) {
        const ctx: CommandContext = {
          msg: cb.message ?? { chat: { id: chatId } },
          chatId,
          args: [],
          miniAppValid: await hasMiniApp(),
        };
        await handler(ctx);
      }
      return;
    }
    if (data.startsWith("promo:")) {
      const code = data.split(":")[1];
      const pkgs = await getVipPackages();
      const inline_keyboard = pkgs.map((p) => [
        { text: p.name, callback_data: `promoplan:${code}:${p.id}` },
      ]);
      inline_keyboard.push([{ text: "Back", callback_data: "cmd:promo" }]);
      const text = `Apply ${code} to which plan?`;
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, text, {
          reply_markup: { inline_keyboard },
        });
      } else {
        await notifyUser(chatId, text, { reply_markup: { inline_keyboard } });
      }
      return;
    }
    if (data.startsWith("promoplan:")) {
      const [, code, planId] = data.split(":");
      const pkgs = await getVipPackages();
      const plan = pkgs.find((p) => p.id === planId);
      if (!plan) {
        await notifyUser(chatId, "Plan not found.");
        return;
      }
      if (!SUPABASE_URL) {
        const msg = await getContent("service_unavailable") ??
          "Service temporarily unavailable. Please try again soon.";
        await notifyUser(chatId, msg);
        return;
      }
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (SUPABASE_SERVICE_ROLE_KEY) {
        headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
      }
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/promo-validate`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ code, telegram_id: userId, plan_id: planId }),
        },
      ).then((r) => r.json()).catch(() => null);
      if (!resp?.ok) {
        const reason = resp?.reason;
        const msg = reason
          ? `Invalid promo code: ${reason}`
          : "Invalid promo code.";
        if (cb.message) {
          await editMessage(chatId, cb.message!.message_id!, msg);
        } else {
          await notifyUser(chatId, msg);
        }
        return;
      }
      const finalAmount = resp.final_amount as number;
      const text =
        `Promo ${code} applied to ${plan.name}.\nOutstanding Amount: ${plan.currency} ${
          finalAmount.toFixed(2)
        }`;
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, text, {
          parse_mode: "Markdown",
        });
      } else {
        await notifyUser(chatId, text, { parse_mode: "Markdown" });
      }
      return;
    }
    if (data.startsWith("buy:")) {
      const planId = data.slice("buy:".length);
      const pkgs = await getVipPackages();
      const plan = pkgs.find((p) => p.id === planId);
      if (plan && cb.message) {
        const inline_keyboard = [
          [{
            text: "Pay by Bank Transfer (Upload Receipt)",
            callback_data: `method:bank:${plan.id}`,
          }],
          [{
            text: "Pay with Crypto",
            callback_data: `method:crypto:${plan.id}`,
          }],
          [{ text: "Back", callback_data: "nav:plans" }],
        ];
        await editMessage(
          chatId,
          cb.message!.message_id!,
          `Choose payment method for ${plan.name}:`,
          { reply_markup: { inline_keyboard } },
        );
      } else if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Plan not found.");
      }
      return;
    }
    if (data.startsWith("method:bank:")) {
      const planId = data.split(":")[2];
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Choose currency:", {
          reply_markup: {
            inline_keyboard: [[
              { text: "USD", callback_data: `currency:bank:USD:${planId}` },
              { text: "MVR", callback_data: `currency:bank:MVR:${planId}` },
            ], [{ text: "Back", callback_data: "nav:plans" }]],
          },
        });
      }
      return;
    }
    if (data.startsWith("method:crypto:")) {
      const planId = data.split(":")[2];
      if (cb.message) {
        await editMessage(chatId, cb.message!.message_id!, "Choose currency:", {
          reply_markup: {
            inline_keyboard: [[
              { text: "USD", callback_data: `currency:crypto:USD:${planId}` },
              { text: "MVR", callback_data: `currency:crypto:MVR:${planId}` },
            ], [{ text: "Back", callback_data: "nav:plans" }]],
          },
        });
      }
      return;
    }
    if (data.startsWith("currency:")) {
      const [, method, currency, planId] = data.split(":");
      let supa;
      try {
        supa = getSupabase();
      } catch (e) {
        console.error("payment creation error", e);
        const msg = await getContent("payment_create_failed") ??
          "Unable to create payment.";
        await notifyUser(chatId, msg);
        return;
      }
      const { data: user } = await supa
        .from("bot_users")
        .select("id")
        .eq("telegram_id", chatId)
        .maybeSingle();
      let userId = user?.id as string | undefined;
      if (!userId) {
        const { data: ins } = await supa
          .from("bot_users")
          .insert({ telegram_id: String(chatId) })
          .select("id")
          .single();
        userId = ins?.id as string | undefined;
      }
      if (!userId) {
        const msg = await getContent("payment_create_failed") ??
          "Unable to create payment.";
        await notifyUser(chatId, msg);
        return;
      }
      const plan = (await getVipPackages()).find((p) => p.id === planId);
      if (!plan) {
        await notifyUser(chatId, "Plan not found.");
        return;
      }
      const usdPrice = plan.price;
      const amount = currency === "MVR" ? usdPrice * 17.5 : usdPrice;
      if (method === "bank") {
        await supa.from("payments").insert({
          user_id: userId,
          plan_id: planId,
          amount,
          currency,
          payment_method: "bank_transfer",
          status: "pending",
        });
        const payCode = `DC-${
          crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()
        }`;
        const { error: piErr } = await supa.from("payment_intents").insert({
          user_id: userId,
          method: "bank",
          expected_amount: amount,
          currency,
          pay_code: payCode,
          status: "pending",
          notes: planId,
        });
        if (piErr) {
          console.error("create bank payment intent error", piErr);
        }
        const { data: banks } = await supa
          .from("bank_accounts")
          .select(
            "bank_name,account_name,account_number,currency",
          )
          .eq("is_active", true)
          .eq("currency", currency)
          .order("display_order");
        const list = (banks as {
          bank_name: string;
          account_name: string;
          account_number: string;
          currency: string;
        }[] || [])
          .map((b) =>
            `${b.bank_name}\nAccount Name: ${b.account_name}\nAccount Number: <code>${b.account_number}</code>\nCurrency: ${b.currency}`
          )
          .join("\n\n");
        const instructions = await getContent("payment_instructions");
        const amountLine = `Outstanding Amount: ${currency} ${
          amount.toFixed(2)
        }\n\n`;
        const message = `${
          instructions ? `${instructions}\n\n` : ""
        }${amountLine}${list}\n\nPay Code: <code>${payCode}</code>\nAdd this in transfer remarks.\nPlease send a photo of your bank transfer receipt.`;
        const { data: us } = await supa
          .from("user_sessions")
          .select("id")
          .eq("telegram_user_id", String(chatId))
          .limit(1)
          .maybeSingle();
        if (us?.id) {
          await supa
            .from("user_sessions")
            .update({
              awaiting_input: `receipt:${planId}`,
              last_activity: new Date().toISOString(),
              is_active: true,
            })
            .eq("id", us.id);
        } else {
          await supa.from("user_sessions").insert({
            telegram_user_id: String(chatId),
            awaiting_input: `receipt:${planId}`,
            last_activity: new Date().toISOString(),
            is_active: true,
          });
        }
        if (cb.message) {
          await editMessage(chatId, cb.message!.message_id!, message, {
            reply_markup: {
              inline_keyboard: [[{ text: "Back", callback_data: "nav:plans" }]],
            },
            parse_mode: "HTML",
          });
        }
      } else if (method === "crypto") {
        const { error: perr } = await supa.from("payments").insert({
          user_id: userId,
          plan_id: planId,
          amount,
          currency,
          payment_method: "crypto",
          status: "pending",
        });
        const address = (await getCryptoDepositAddress()) ||
          "Please contact support for the crypto address.";
        if (perr) {
          console.error("create crypto payment error", perr);
          const msg = await getContent("payment_create_failed") ??
            "Unable to create payment. Please try again later.";
          await notifyUser(chatId, msg);
        } else if (cb.message) {
          const instructions = await getContent("payment_instructions");
          const msg = instructions
            ? `${instructions}\n\nAmount: ${currency} ${
              amount.toFixed(2)
            }\nSend the payment to ${address} and reply with the transaction details for manual approval.`
            : `Amount: ${currency} ${
              amount.toFixed(2)
            }\nSend the payment to ${address} and reply with the transaction details for manual approval.`;
          await editMessage(chatId, cb.message!.message_id!, msg, {
            reply_markup: {
              inline_keyboard: [[{ text: "Back", callback_data: "nav:plans" }]],
            },
            parse_mode: "HTML",
          });
        }
      }
      return;
    }
    const handlers = await loadAdminHandlers();
    if (data.startsWith("toggle_flag_")) {
      const flag = data.replace("toggle_flag_", "");
      await handlers.handleToggleFeatureFlag(chatId, userId, flag);
    } else {
      const dyn = getDynamicCallbackHandler(data, handlers);
      if (dyn) {
        await dyn(chatId, userId);
      } else {
        const callbackHandlers = buildCallbackHandlers(handlers);
        const handler = callbackHandlers[data] ?? defaultCallbackHandler;
        await handler(chatId, userId);
      }
    }
  } catch (err) {
    console.error("handleCallback error", err);
  } finally {
    setCallbackMessageId(null);
  }
}

export async function startReceiptPipeline(
  update: TelegramUpdate,
): Promise<void> {
  try {
    const chatId = update.message!.chat.id;
    if (!(await getFlag("vip_sync_enabled"))) {
      const msg = await getContent("vip_sync_disabled") ??
        "VIP sync is currently disabled.";
      await notifyUser(chatId, msg);
      return;
    }
    const fileId = getFileIdFromUpdate(update);
    if (!fileId) {
      const msg = await getContent("no_receipt_image") ??
        "No receipt image found.";
      await notifyUser(chatId, msg);
      return;
    }
    let supa;
    try {
      supa = getSupabase();
    } catch (e) {
      console.error("startReceiptPipeline error", e);
      const msg = await getContent("receipt_processing_unavailable") ??
        "Receipt processing unavailable.";
      await notifyUser(chatId, msg);
      return;
    }
    const { data: session } = await supa
      .from("user_sessions")
      .select("id,awaiting_input")
      .eq("telegram_user_id", String(chatId))
      .maybeSingle();
    const awaiting = session?.awaiting_input || "";
    if (!awaiting.startsWith("receipt:")) {
      const msg = await getContent("no_pending_purchase") ??
        "No pending purchase. Use /buy to select a plan.";
      await notifyUser(chatId, msg);
      return;
    }
    const planId = awaiting.split(":")[1];
    const { data: user } = await supa
      .from("bot_users")
      .select("id")
      .eq("telegram_id", chatId)
      .maybeSingle();
    if (!user?.id) {
      const msg = await getContent("start_before_receipts") ??
        "Please use /start before sending receipts.";
      await notifyUser(chatId, msg);
      return;
    }
    if (!BOT_TOKEN) {
      const msg = await getContent("receipt_processing_unavailable") ??
        "Receipt processing unavailable.";
      await notifyUser(chatId, msg);
      return;
    }
    const fileInfo = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`,
    ).then((r) => r.json()).catch(() => null);
    const path = fileInfo?.result?.file_path;
    if (!path) {
      const msg = await getContent("cannot_fetch_receipt") ??
        "Cannot fetch receipt.";
      await notifyUser(chatId, msg);
      return;
    }
    const blob = await fetch(
      `https://api.telegram.org/file/bot${BOT_TOKEN}/${path}`,
    ).then((r) => r.blob());

    let parsedSlip: ParsedSlip | null = null;
    try {
      const ocrText = await ocrTextFromBlobImpl(blob);
      parsedSlip = parseBankSlipImpl(ocrText);
    } catch (error) {
      console.error("Failed to OCR/parse bank slip", error);
    }

    const hash = await hashBlob(blob);
    const storagePath = `receipts/${chatId}/${hash}`;
    try {
      await storeReceiptImage(blob, storagePath);
    } catch (error) {
      console.error("Failed to store receipt image", error);
      const msg = await getContent("receipt_upload_failed") ??
        "Failed to upload receipt. Please try again later.";
      await notifyUser(chatId, msg);
      return;
    }

    // Get plan details for proper amount
    const { data: plan } = await supa.from("subscription_plans")
      .select("price, currency")
      .eq("id", planId)
      .maybeSingle();

    const { data: pay } = await supa.from("payments")
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: plan?.price || 0,
        currency: plan?.currency || "USD",
        payment_method: "bank_transfer",
        status: "pending",
      })
      .select("id")
      .single();
    if (!pay?.id || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const msg = await getContent("receipt_submit_failed") ??
        "Failed to submit receipt. Please try again later.";
      await notifyUser(chatId, msg);
      return;
    }
    const rs = await fetch(`${SUPABASE_URL}/functions/v1/receipt-submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        telegram_id: String(chatId),
        payment_id: pay.id,
        file_path: storagePath,
        bucket: "payment-receipts",
        ...(parsedSlip ? { parsed_slip: parsedSlip } : {}),
      }),
    }).then((r) => r.json()).catch(() => null);
    if (!rs?.ok) {
      if (rs?.error === "duplicate_receipt") {
        const dupMsg = typeof rs.message === "string" && rs.message
          ? rs.message
          : await getContent("duplicate_receipt_detected") ??
            "We already received this receipt. Please upload a different image.";
        await notifyUser(chatId, dupMsg);
        try {
          await supa.from("payments").delete().eq("id", pay.id);
        } catch (cleanupErr) {
          console.error("Failed to clean up duplicate payment", cleanupErr);
        }
      } else {
        const msg = await getContent("receipt_submit_failed") ??
          "Failed to submit receipt. Please try again later.";
        await notifyUser(chatId, msg);
      }
      return;
    }
    await supa.from("user_sessions").update({ awaiting_input: null }).eq(
      "id",
      session?.id,
    );
    const msg = await getContent("receipt_received") ??
      "✅ Receipt received. We'll review it shortly.";
    await notifyUser(chatId, msg);
  } catch (err) {
    console.error("startReceiptPipeline error", err);
  }
}

export async function serveWebhook(req: Request): Promise<Response> {
  // CORS preflight support for browser calls
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const v = version(req, "telegram-bot");
  if (v) return v;
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.pathname.endsWith("/echo")) {
      return ok({ echo: true, ua: req.headers.get("user-agent") || "" });
    }
    return mna();
  }
  if (req.method !== "POST") return mna();

  // Only validate webhook secret for POST requests
  const receivedSecret = req.headers.get(SECRET_HEADER);
  const authResp = await validateTelegramHeader(req);
  if (authResp) {
    console.error(
      "Telegram webhook auth failed - expected secret not found or mismatch",
    );
    console.error(
      "Make sure TELEGRAM_WEBHOOK_SECRET is set correctly in Supabase secrets",
    );
    console.error("received header", receivedSecret ? "present" : "missing");
    return authResp;
  }

  try {
    const { ok: envOk, missing } = checkEnv(REQUIRED_ENV_KEYS);
    if (!envOk) {
      console.error("Missing env vars", missing);
      return oops("Missing env vars", missing);
    }

    try {
      requireMiniAppEnv();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Mini app env missing", msg);
      return oops(msg);
    }

    const body = await extractTelegramUpdate(req);
    if (
      body && typeof body === "object" &&
      (body as { test?: string }).test === "ping" &&
      Object.keys(body).length === 1
    ) {
      return ok({ pong: true });
    }
    if (!body) {
      // Empty/invalid JSON - skip logging to reduce noise
      return json({ ok: false, error: "Invalid JSON" }, 400);
    }
    const update = body as TelegramUpdate;
    if (!bot) {
      console.warn("Bot token not set; cannot handle update");
      return oops("Bot token not configured");
    }
    // Cast to any since our TelegramUpdate type omits some required fields for grammy
    await bot.handleUpdate(update as any);

    if (update.chat_member || update.my_chat_member) {
      await handleMembershipUpdate(update);
      return ok({ handled: true, kind: "chat_member" });
    }

    if (update.callback_query) {
      await handleCallback(update);
      return ok({ handled: true, kind: "callback_query" });
    }

    // ---- BAN CHECK (short-circuit early) ----
    const supa = supaSvc();
    const fromId = String(update?.message?.from?.id ?? "");
    if (fromId) {
      try {
        const { data: ban } = await supa.from("abuse_bans")
          .select("expires_at")
          .eq("telegram_id", fromId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (ban && (!ban.expires_at || new Date(ban.expires_at) > new Date())) {
          // optional: send a one-time notice
          return json({ ok: false, error: "Forbidden" }, 403);
        }
      } catch {
        /* swallow */
      }
    }

    const tgId = fromId;
    if (tgId) {
      const rl = await enforceRateLimit(tgId);
      if (rl) return rl; // 429
      const isCmd = !!update?.message?.text?.startsWith("/");
      await logInteraction(
        isCmd ? "command" : "message",
        tgId,
        update?.message?.text ?? null,
      );
    }

    if (!update.callback_query) {
      await handleCommand(update);
    }

    const fileId = isDirectMessage(update.message)
      ? getFileIdFromUpdate(update)
      : null;
    if (fileId) {
      await startReceiptPipeline(update);
    }

    return ok({ handled: true });
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error("telegram-bot error:", errMsg);
    await alertAdmins(`🚨 <b>Bot error</b>\n<code>${String(e)}</code>`);
    try {
      const supa = supaSvc();
      await supa.from("admin_logs").insert({
        admin_telegram_id: "system",
        action_type: "bot_error",
        action_description: String(e),
      });
    } catch {
      /* swallow */
    }
    return oops("Internal Error");
  }
}

export { answerCallbackQuery, editMessage, sendMessage };
export default serveWebhook;
registerHandler(serveWebhook);
