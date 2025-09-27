import type { Metadata } from "next";
import BotDashboard from "@/components/telegram/BotDashboard";

export const metadata: Metadata = {
  title: "Telegram Bot Dashboard | Dynamic Capital",
  description:
    "Unified control center for Dynamic Capital. Monitor Telegram bot activity, configure webhooks, and access admin tooling from the Next.js app.",
};

export const dynamic = "force-dynamic";

export default function TelegramDashboardPage() {
  return <BotDashboard />;
}
