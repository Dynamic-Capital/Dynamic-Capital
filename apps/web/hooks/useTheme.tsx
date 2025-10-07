"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme as useDynamicUiTheme } from "@/components/dynamic-ui-system";

import { callEdgeFunction } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

import {
  createThemeModeSetter,
  type TelegramWebApp,
  type Theme,
} from "./theme-persistence";

const isValidTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

export function useTheme() {
  const { theme: dynamicUiTheme, resolvedTheme, setTheme: setDynamicUiTheme } =
    useDynamicUiTheme();
  const preference = (dynamicUiTheme ?? "system") as Theme;
  const [session, setSession] = useState<Session | null>(null);
  const preferenceRef = useRef<Theme>(preference);

  useEffect(() => {
    preferenceRef.current = preference;
  }, [preference]);
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

  const applyTheme = useCallback(
    (value: Theme) => {
      setDynamicUiTheme(value);
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
      persistPreference(value, { skip: Boolean(tg) });
    },
    [persistPreference, setDynamicUiTheme],
  );

  const fetchTheme = useCallback(
    async (activeSession: Session | null) => {
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;

      if (activeSession?.access_token) {
        const { data, error } = await callEdgeFunction<
          { mode?: "auto" | Theme }
        >(
          "THEME_GET",
          {
            token: activeSession.access_token,
          },
        );

        if (!error && data) {
          const mode = data.mode;
          if (mode) {
            applyTheme(mode === "auto" ? "system" : mode);
          } else {
            applyTheme("system");
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
        } catch {
          applyTheme("system");
        }
      } else {
        applyTheme("system");
      }
    },
    [applyTheme],
  );

  useEffect(() => {
    let mounted = true;

    const handleSessionChange = (nextSession: Session | null) => {
      if (mounted) {
        setSession(nextSession);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
      fetchTheme(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, nextSession) => {
      handleSessionChange(nextSession);
      fetchTheme(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchTheme]);

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

  const setThemeMode = useMemo(
    () =>
      createThemeModeSetter({
        setDynamicUiTheme,
        persistPreference,
        getSession: () => session,
        callRemote: callEdgeFunction,
        getCurrentPreference: () => preferenceRef.current,
      }),
    [persistPreference, session, setDynamicUiTheme],
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

  const isInTelegram = typeof window !== "undefined" &&
    Boolean(globalThis.Telegram?.WebApp as TelegramWebApp | undefined);

  return {
    theme: preference,
    currentTheme: appliedTheme,
    systemTheme,
    setTheme: setThemeMode,
    toggleTheme,
    isInTelegram,
  };
}
