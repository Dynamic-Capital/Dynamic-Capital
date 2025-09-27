/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
export type MenuSection = "dashboard" | "plans" | "support";

// Minimal Telegram markup types to avoid heavyweight grammy dependency
export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

import { getContentBatch } from "../_shared/config.ts";

export async function buildMainMenu(
  section: MenuSection,
): Promise<InlineKeyboardMarkup> {
  // Batch load menu labels for performance
  const menuKeys = [
    "menu_dashboard_label",
    "menu_plans_label",
    "menu_support_label",
    "menu_packages_label",
    "menu_promo_label",
    "menu_account_label",
    "menu_faq_label",
    "menu_education_label",
    "menu_ask_label",
    "menu_shouldibuy_label",
  ];

  const defaults = {
    menu_dashboard_label: "📊 Dashboard",
    menu_plans_label: "💳 Plans",
    menu_support_label: "💬 Support",
    menu_packages_label: "📦 Packages",
    menu_promo_label: "🎁 Promo",
    menu_account_label: "👤 Account",
    menu_faq_label: "❓ FAQ",
    menu_education_label: "📚 Education",
    menu_ask_label: "🤖 Ask",
    menu_shouldibuy_label: "💡 Should I Buy?",
  };

  const labels = await getContentBatch(menuKeys, defaults);

  const firstRow: InlineKeyboardButton[] = [
    {
      text: `${section === "dashboard" ? "✅ " : ""}${labels
        .menu_dashboard_label!}`,
      callback_data: "nav:dashboard",
    },
    {
      text: `${section === "plans" ? "✅ " : ""}${labels.menu_plans_label!}`,
      callback_data: "nav:plans",
    },
    {
      text: `${section === "support" ? "✅ " : ""}${labels
        .menu_support_label!}`,
      callback_data: "nav:support",
    },
  ];

  const kb: InlineKeyboardButton[][] = [
    firstRow,
    [
      { text: labels.menu_packages_label!, callback_data: "cmd:packages" },
      { text: labels.menu_promo_label!, callback_data: "cmd:promo" },
      { text: labels.menu_account_label!, callback_data: "cmd:account" },
    ],
    [
      { text: labels.menu_faq_label!, callback_data: "cmd:faq" },
      { text: labels.menu_education_label!, callback_data: "cmd:education" },
    ],
    [
      { text: labels.menu_ask_label!, callback_data: "cmd:ask" },
      { text: labels.menu_shouldibuy_label!, callback_data: "cmd:shouldibuy" },
    ],
  ];

  return { inline_keyboard: kb };
}
