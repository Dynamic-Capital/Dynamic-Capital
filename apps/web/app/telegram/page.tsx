import type { Metadata } from "next";
import BotDashboard from "@/components/telegram/BotDashboard";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: `Telegram Bot Dashboard | ${brand.identity.name}`,
  description:
    `Unified control center for ${brand.identity.name}. Monitor Telegram bot activity, configure webhooks, and access admin tooling from the Next.js app.`,
};

export const dynamic = "force-dynamic";

export default function TelegramDashboardPage() {
  return <BotDashboard />;
}
