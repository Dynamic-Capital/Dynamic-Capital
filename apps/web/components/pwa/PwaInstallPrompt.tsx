"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_DISMISSED_AT_KEY = "dynamic-capital::pwa-install-dismissed-at";
const DISMISSAL_COOLDOWN_MS = 1000 * 60 * 60 * 24; // 24 hours

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function isStandaloneDisplay(): boolean {
  if (!canUseWindow()) return false;
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  const navigatorWithStandalone = window.navigator as
    & Navigator
    & { standalone?: boolean };
  return Boolean(navigatorWithStandalone.standalone);
}

function getLastDismissedAt(): number | null {
  if (!canUseWindow()) return null;
  try {
    const value = window.localStorage.getItem(INSTALL_DISMISSED_AT_KEY);
    return value ? Number.parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

function setLastDismissedAt(timestamp: number): void {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(INSTALL_DISMISSED_AT_KEY, `${timestamp}`);
  } catch {
    // Ignore storage errors (e.g., Safari private mode)
  }
}

function clearLastDismissedAt(): void {
  if (!canUseWindow()) return;
  try {
    window.localStorage.removeItem(INSTALL_DISMISSED_AT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function PwaInstallPrompt() {
  const { toast } = useToast();
  const [promptEvent, setPromptEvent] = useState<
    BeforeInstallPromptEvent | null
  >(
    null,
  );
  const [visible, setVisible] = useState(false);

  const isDismissalExpired = useMemo(() => {
    const lastDismissedAt = getLastDismissedAt();
    if (!lastDismissedAt) return true;
    return Date.now() - lastDismissedAt > DISMISSAL_COOLDOWN_MS;
  }, []);

  useEffect(() => {
    if (!canUseWindow()) return;
    if (isStandaloneDisplay()) {
      clearLastDismissedAt();
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isDismissalExpired) return;
      setPromptEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      clearLastDismissedAt();
      setVisible(false);
      setPromptEvent(null);
      toast({
        title: "Dynamic Capital installed",
        description:
          "You can now launch the PWA directly from your home screen.",
      });
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [isDismissalExpired, toast]);

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        toast({
          title: "Installation in progress",
          description:
            "Dynamic Capital will appear in your installed apps momentarily.",
        });
      } else {
        setLastDismissedAt(Date.now());
      }
    } catch (error) {
      console.error("Failed to trigger PWA install prompt", error);
      toast({
        title: "Unable to open install dialog",
        description:
          "Your browser blocked the install prompt. Try using the browser menu to add Dynamic Capital to your home screen.",
        variant: "destructive",
      });
    } finally {
      setVisible(false);
      setPromptEvent(null);
    }
  }, [promptEvent, toast]);

  const handleDismiss = useCallback(() => {
    setLastDismissedAt(Date.now());
    setVisible(false);
    setPromptEvent(null);
  }, []);

  if (!visible || !promptEvent) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-xl flex-col gap-3 rounded-2xl border border-white/10 bg-background/95 p-4 text-left shadow-2xl backdrop-blur">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Install Dynamic Capital
          </p>
          <p className="mt-1 text-sm text-muted-foreground/80">
            Save the trading terminal on your home screen to receive instant
            access to signals and portfolio automation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleInstall} size="sm" className="min-w-[7rem]">
            Install now
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="min-w-[7rem]"
          >
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
