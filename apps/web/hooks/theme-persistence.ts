import type { CallEdgeFunction } from "@/config/supabase";

export type Theme = "light" | "dark" | "system";

export interface TelegramWebApp {
  colorScheme: "light" | "dark";
  onEvent?: (event: "themeChanged", handler: () => void) => void;
  offEvent?: (event: "themeChanged", handler: () => void) => void;
}

export interface ThemeSessionLike {
  access_token?: string | null;
}

export interface ThemeModeSetterDeps {
  setDynamicUiTheme: (value: Theme) => void;
  persistPreference: (value: Theme, options?: { skip?: boolean }) => void;
  getSession: () => ThemeSessionLike | null;
  callRemote: CallEdgeFunction;
  getTelegramWebApp?: () => TelegramWebApp | undefined;
  getCurrentPreference?: () => Theme | undefined;
}

export const createThemeModeSetter = ({
  setDynamicUiTheme,
  persistPreference,
  getSession,
  callRemote,
  getTelegramWebApp,
  getCurrentPreference,
}: ThemeModeSetterDeps) => {
  const resolveTelegramWebApp = getTelegramWebApp ??
    (() => globalThis.Telegram?.WebApp as TelegramWebApp | undefined);
  const resolveGetCurrentPreference = getCurrentPreference ?? (() => undefined);

  return async (newTheme: Theme) => {
    setDynamicUiTheme(newTheme);
    const tg = resolveTelegramWebApp();
    persistPreference(newTheme, { skip: Boolean(tg) });

    const currentPreference = resolveGetCurrentPreference();
    if (currentPreference !== undefined && currentPreference === newTheme) {
      return;
    }

    const session = getSession();

    if (session?.access_token) {
      const { error } = await callRemote("THEME_SAVE", {
        method: "POST",
        token: session.access_token,
        body: { mode: newTheme === "system" ? "auto" : newTheme },
      });

      if (error) {
        // ignore errors
      }
    }
  };
};
