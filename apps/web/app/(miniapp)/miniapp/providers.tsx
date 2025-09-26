"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  applyThemeVars,
  hideBackButton,
  hideMainButton,
  initTelegram,
  showBackButton,
} from "@/lib/telegram";
import { attachGlobalTonConnect, getMiniAppThemeManager } from "@/lib/miniapp-theme";

export default function MiniAppProviders(
  { children }: { children: ReactNode },
) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initTelegram();
    applyThemeVars();
    const themeManager = getMiniAppThemeManager();
    const detachTonConnect = attachGlobalTonConnect(themeManager);
    const webApp: any = (window as any)?.Telegram?.WebApp;
    const onTheme = () => applyThemeVars();
    webApp?.onEvent?.("themeChanged", onTheme);
    return () => {
      detachTonConnect?.();
      webApp?.offEvent?.("themeChanged", onTheme);
    };
  }, []);

  useEffect(() => {
    if (!pathname) return;
    let cleanupBack: (() => void) | undefined;
    if (pathname === "/miniapp" || pathname === "/miniapp/home") {
      hideBackButton();
    } else {
      cleanupBack = showBackButton(() => router.back());
    }

    const allowMainButton = pathname === "/miniapp/account" ||
      pathname === "/miniapp/signals";
    if (!allowMainButton) {
      hideMainButton();
    }

    return () => {
      cleanupBack?.();
      hideBackButton();
      hideMainButton();
    };
  }, [pathname, router]);

  return <>{children}</>;
}
