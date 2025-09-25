"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme as useDynamicUiTheme } from "@dynamic-ui-system/core";

import { callEdgeFunction } from "@/config/supabase";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type Theme = "light" | "dark" | "system";

interface TelegramWebApp {
  colorScheme: "light" | "dark";
  onEvent?: (event: "themeChanged", handler: () => void) => void;
  offEvent?: (event: "themeChanged", handler: () => void) => void;
}

const isValidTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

export function useTheme() {
  const { theme: dynamicUiTheme, resolvedTheme, setTheme: setDynamicUiTheme } =
    useDynamicUiTheme();
  const preference = (dynamicUiTheme ?? "system") as Theme;
  const [session, setSession] = useState<Session | null>(null);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";

    const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
    if (tg) {
      return tg.colorScheme;
    }

    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
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
    const applyTheme = (value: Theme) => {
      setDynamicUiTheme(value);
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
      persistPreference(value, { skip: Boolean(tg) });
    };

    const fetchTheme = async () => {
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;

      if (session?.access_token) {
        const { data, error } = await callEdgeFunction<
          { mode?: "auto" | Theme }
        >(
          "THEME_GET",
          {
            token: session.access_token,
          },
        );

        if (!error && data) {
          const mode = data.mode;
          applyTheme(mode === "auto" ? "system" : mode);
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

    const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const setThemeMode = useCallback(
    async (newTheme: Theme) => {
      setDynamicUiTheme(newTheme);
      const tg = globalThis.Telegram?.WebApp as TelegramWebApp | undefined;
      persistPreference(newTheme, { skip: Boolean(tg) });

      if (session?.access_token) {
        const { error } = await callEdgeFunction("THEME_SAVE", {
          method: "POST",
          token: session.access_token,
          body: { mode: newTheme === "system" ? "auto" : newTheme },
        });

        if (error) {
          // ignore errors
        }
      }
    },
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
