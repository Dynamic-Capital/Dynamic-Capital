/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
export type MenuSection = "dashboard" | "plans" | "support";

import { InlineKeyboard } from "https://deno.land/x/grammy@v1.19.1/mod.ts";
import type { InlineKeyboardMarkup } from "https://deno.land/x/grammy@v1.19.1/types.ts";
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
    "menu_shouldibuy_label"
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
    menu_shouldibuy_label: "💡 Should I Buy?"
  };
  
  const labels = await getContentBatch(menuKeys, defaults);

  const kb = new InlineKeyboard()
    .text(
      `${section === "dashboard" ? "✅ " : ""}${labels.menu_dashboard_label!}`,
      "nav:dashboard",
    )
    .text(
      `${section === "plans" ? "✅ " : ""}${labels.menu_plans_label!}`,
      "nav:plans",
    )
    .text(
      `${section === "support" ? "✅ " : ""}${labels.menu_support_label!}`,
      "nav:support",
    )
    .row()
    .text(labels.menu_packages_label!, "cmd:packages")
    .text(labels.menu_promo_label!, "cmd:promo")
    .text(labels.menu_account_label!, "cmd:account")
    .row()
    .text(labels.menu_faq_label!, "cmd:faq")
    .text(labels.menu_education_label!, "cmd:education")
    .row()
    .text(labels.menu_ask_label!, "cmd:ask")
    .text(labels.menu_shouldibuy_label!, "cmd:shouldibuy");

  return kb;
}
