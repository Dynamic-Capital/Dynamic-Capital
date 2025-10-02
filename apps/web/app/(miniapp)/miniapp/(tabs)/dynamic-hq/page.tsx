"use client";

import HomeLanding from "@/components/miniapp/HomeLanding";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

type HomeLandingTelegramData = {
  user?: { id: number };
};

export default function DynamicHqTab() {
  const { telegramUser } = useTelegramAuth();

  const telegramData: HomeLandingTelegramData = telegramUser
    ? { user: { id: telegramUser.id } }
    : {};

  return <HomeLanding telegramData={telegramData} />;
}
