import test from "node:test";
import { equal as assertEquals } from "node:assert/strict";
import process from "node:process";

process.env.SUPABASE_URL = "http://localhost";
process.env.SUPABASE_ANON_KEY = "anon";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service";

const { buildMainMenu } = await import(
  /* @vite-ignore */ "../supabase/functions/telegram-bot/menu.ts"
);
const cfg = await import(
  /* @vite-ignore */ "../supabase/functions/_shared/config.ts"
);

test("buildMainMenu highlights active section", async () => {
  const original = cfg.getContent;
  cfg.__setGetContent(
    <T>(key: string): Promise<T | null> => {
      const map: Record<string, string | undefined> = {
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
      const value = (map[key] ?? null) as T | null;
      return Promise.resolve(value);
    },
  );

  const dash = await buildMainMenu("dashboard");
  assertEquals(dash.inline_keyboard[0][0].text, "✅ 📊 Dashboard");
  assertEquals(dash.inline_keyboard[0][1].text, "💳 Plans");

  const plans = await buildMainMenu("plans");
  assertEquals(plans.inline_keyboard[0][0].text, "📊 Dashboard");
  assertEquals(plans.inline_keyboard[0][1].text, "✅ 💳 Plans");

  cfg.__setGetContent(original);
});
