"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme as useDynamicUiTheme } from "@/components/dynamic-ui-system";

import { callEdgeFunction } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";
import { useThemeEntitlements } from "@/hooks/useThemeEntitlements";
import {
  applyDynamicBranding,
} from "../../../shared/branding/applyDynamicBranding.ts";
import { isThemePassId } from "../../../shared/theme/passes.ts";
import type { Session } from "@supabase/supabase-js";

type Theme = "light" | "dark" | "system";

interface TelegramWebApp {
  colorScheme: "light" | "dark";
  onEvent?: (event: "themeChanged", handler: () => void) => void;
  offEvent?: (event: "themeChanged", handler: () => void) => void;
}

const isValidTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

const THEME_PASS_STORAGE_KEY = "theme-pass:id";

function readStoredThemePass(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(THEME_PASS_STORAGE_KEY);
    return raw && raw.trim().length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function persistThemePass(value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(THEME_PASS_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(THEME_PASS_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function applyThemePassAttributes(value: string | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (value) {
    root.setAttribute("data-theme-pass", value);
  } else {
    root.removeAttribute("data-theme-pass");
  }
}

export function useTheme() {
  const { theme: dynamicUiTheme, resolvedTheme, setTheme: setDynamicUiTheme } =
    useDynamicUiTheme();
  const preference = (dynamicUiTheme ?? "system") as Theme;
  const [session, setSession] = useState<Session | null>(null);
  const [themePassId, setThemePassId] = useState<string | null>(
    () => readStoredThemePass(),
  );
  const {
    entitlements,
    dctBalance,
    isLoading: entitlementsLoading,
    error: entitlementsError,
    refresh: refreshEntitlements,
  } = useThemeEntitlements();
  const getTimeBasedTheme = useCallback(() => {
    if (typeof window === "undefined") return "light";

    const now = new Date();
    const hour = now.getHours();
    const isNight = hour >= 19 || hour < 6;

    return isNight ? "dark" : "light";
  }, []);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";

    const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
    if (tg) {
      return tg.colorScheme;
    }

    return getTimeBasedTheme();
  });

  const appliedTheme = resolvedTheme ??
    (preference === "system" ? systemTheme : preference);

  const persistPreference = useCallback(
    (value: Theme, { skip } = { skip: false }) => {
      if (typeof window === "undefined") {
        return;
      }

      try {
        if (!skip) {
          localStorage.setItem("data-theme", value);
        }
        localStorage.removeItem("theme");
      } catch {
        // ignore persistence issues
      }
    },
    [],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyThemePassAttributes(themePassId);
    persistThemePass(themePassId);
    try {
      applyDynamicBranding();
    } catch {
      // ignore branding refresh errors
    }
  }, [themePassId]);

  useEffect(() => {
    const applyTheme = (value: Theme) => {
      setDynamicUiTheme(value);
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
      persistPreference(value, { skip: Boolean(tg) });
    };

    const fetchTheme = async () => {
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;

      if (session?.access_token) {
        const { data, error } = await callEdgeFunction<
          { mode?: "auto" | Theme; themePassId?: string | null }
        >(
          "THEME_GET",
          {
            token: session.access_token,
          },
        );

        if (!error && data) {
          const mode = data.mode;
          applyTheme(mode === "auto" ? "system" : mode);
          if (data.themePassId === null) {
            setThemePassId(null);
          } else if (
            typeof data.themePassId === "string" &&
            isThemePassId(data.themePassId)
          ) {
            setThemePassId(data.themePassId);
          } else {
            setThemePassId(readStoredThemePass());
          }
          return;
        }
      }

      if (typeof window === "undefined") {
        return;
      }

      if (!tg) {
        try {
          const stored = (localStorage.getItem("data-theme") as Theme | null) ??
            (localStorage.getItem("theme") as Theme | null);

          if (isValidTheme(stored)) {
            applyTheme(stored);
          } else {
            applyTheme("system");
          }
          setThemePassId(readStoredThemePass());
        } catch {
          applyTheme("system");
        }
      } else {
        applyTheme("system");
        setThemePassId(readStoredThemePass());
      }
    };

    fetchTheme();
  }, [persistPreference, session, setDynamicUiTheme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const themeToApply = appliedTheme;

    root.classList.toggle("dark", themeToApply === "dark");
    root.setAttribute("data-theme", themeToApply);
    root.style.colorScheme = themeToApply === "dark" ? "dark" : "light";

    if (document.body) {
      document.body.style.colorScheme = themeToApply === "dark"
        ? "dark"
        : "light";
    }
  }, [appliedTheme]);

  useEffect(() => {
    const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;

    if (tg) {
      const handleTelegramTheme = () => {
        setSystemTheme(tg.colorScheme);
      };

      handleTelegramTheme();

      if (typeof tg.onEvent === "function") {
        tg.onEvent("themeChanged", handleTelegramTheme);
        return () => {
          tg.offEvent?.("themeChanged", handleTelegramTheme);
        };
      }

      const interval = setInterval(handleTelegramTheme, 1000);
      return () => clearInterval(interval);
    }

    if (typeof window === "undefined") {
      return;
    }

    let timeout: number | undefined;

    const applyTimeBasedTheme = () => {
      setSystemTheme(getTimeBasedTheme());
    };

    const getMillisecondsUntilNextTransition = () => {
      const now = new Date();
      const next = new Date(now);
      const isCurrentlyNight = getTimeBasedTheme() === "dark";

      if (isCurrentlyNight) {
        next.setHours(6, 0, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      } else {
        next.setHours(19, 0, 0, 0);
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
      }

      return Math.max(1, next.getTime() - now.getTime());
    };

    const scheduleNextUpdate = () => {
      const delay = getMillisecondsUntilNextTransition();

      timeout = window.setTimeout(() => {
        applyTimeBasedTheme();
        scheduleNextUpdate();
      }, delay);
    };

    applyTimeBasedTheme();
    scheduleNextUpdate();

    return () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [getTimeBasedTheme]);

  const setThemeMode = useCallback(
    async (newTheme: Theme) => {
      setDynamicUiTheme(newTheme);
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
      persistPreference(newTheme, { skip: Boolean(tg) });

      if (session?.access_token) {
        const payloadMode = newTheme === "system" ? "auto" : newTheme;
        const { error } = await callEdgeFunction("THEME_SAVE", {
          method: "POST",
          token: session.access_token,
          body: { mode: payloadMode, themePassId: themePassId ?? null },
        });

        if (error) {
          // ignore errors
        }
      }
    },
    [persistPreference, session, setDynamicUiTheme, themePassId],
  );

  const toggleTheme = useCallback(() => {
    if (preference === "light") {
      setThemeMode("dark");
    } else if (preference === "dark") {
      setThemeMode("system");
    } else {
      setThemeMode("light");
    }
  }, [preference, setThemeMode]);

  const setThemePass = useCallback(
    async (nextPassId: string | null) => {
      const normalized = nextPassId && isThemePassId(nextPassId)
        ? nextPassId
        : null;
      if (themePassId === normalized) {
        return;
      }
      setThemePassId((current) => {
        if (current === normalized) {
          return current;
        }
        return normalized;
      });

      if (session?.access_token) {
        const payloadMode = preference === "system" ? "auto" : preference;
        const { error } = await callEdgeFunction("THEME_SAVE", {
          method: "POST",
          token: session.access_token,
          body: { mode: payloadMode, themePassId: normalized },
        });
        if (error) {
          // ignore persistence failures
        }
      }
    },
    [preference, session?.access_token, themePassId],
  );

  const isInTelegram = typeof window !== "undefined" &&
    Boolean(globalThis.Telegram?.WebApp as TelegramWebApp | undefined);

  return {
    theme: preference,
    currentTheme: appliedTheme,
    systemTheme,
    setTheme: setThemeMode,
    toggleTheme,
    isInTelegram,
    themePassId,
    setThemePass,
    themeEntitlements: entitlements,
    themeEntitlementsLoading: entitlementsLoading,
    themeEntitlementsError: entitlementsError,
    refreshThemeEntitlements: refreshEntitlements,
    themeEntitlementsDctBalance: dctBalance,
  };
}
