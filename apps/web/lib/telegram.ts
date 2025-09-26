// Minimal helpers for Telegram WebApp API
const globalAny: any = typeof window !== "undefined" ? window : undefined;
export const tg = globalAny?.Telegram?.WebApp as
  | undefined
  | (typeof globalAny.Telegram.WebApp & {
    __dcMainHandler?: () => void;
    __dcBackHandler?: () => void;
  });

export function initTelegram() {
  if (!tg) return;
  tg.ready();
  try {
    tg.expand();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tg] expand skipped", error);
    }
  }
  try {
    tg.disableVerticalSwipes && tg.disableVerticalSwipes();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tg] disableVerticalSwipes skipped", error);
    }
  }
}

export function applyThemeVars() {
  if (!tg) return;
  const params = tg.themeParams || {};
  const set = (key: string, value?: string) => {
    if (!value) return;
    document.documentElement.style.setProperty(key, value);
  };
  set("--tg-bg", params.bg_color);
  set("--tg-text", params.text_color);
  set("--tg-muted", params.hint_color);
  set("--tg-accent", params.button_color);
  set("--tg-button", params.button_color);
  try {
    tg.setHeaderColor?.(params.bg_color || "#0b0d12");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tg] setHeaderColor skipped", error);
    }
  }
}

export function setMainButton(text: string, onClick?: () => void) {
  if (!tg) return;
  const button = tg.MainButton;
  button.setText(text);
  button.show();
  if (onClick) {
    const handler = () => onClick();
    if (tg.__dcMainHandler) {
      tg.offEvent?.("mainButtonClicked", tg.__dcMainHandler);
    }
    tg.__dcMainHandler = handler;
    tg.onEvent?.("mainButtonClicked", handler);
  }
}

export function hideMainButton() {
  if (!tg) return;
  if (tg.__dcMainHandler) {
    tg.offEvent?.("mainButtonClicked", tg.__dcMainHandler);
    tg.__dcMainHandler = undefined;
  }
  tg.MainButton?.hide();
}

export function showBackButton(cb?: () => void) {
  if (!tg) return () => {};
  const backButton = tg.BackButton;
  backButton.show();
  if (!cb) return () => {};
  const handler = () => cb();
  if (tg.__dcBackHandler) {
    tg.offEvent?.("backButtonClicked", tg.__dcBackHandler);
  }
  tg.__dcBackHandler = handler;
  tg.onEvent?.("backButtonClicked", handler);
  return () => {
    if (tg.__dcBackHandler) {
      tg.offEvent?.("backButtonClicked", tg.__dcBackHandler);
      tg.__dcBackHandler = undefined;
    }
  };
}

export function hideBackButton() {
  if (!tg) return;
  if (tg.__dcBackHandler) {
    tg.offEvent?.("backButtonClicked", tg.__dcBackHandler);
    tg.__dcBackHandler = undefined;
  }
  tg.BackButton?.hide();
}

export function haptic(type: "light" | "medium" | "heavy" = "light") {
  try {
    tg?.HapticFeedback?.impactOccurred(type);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tg] haptic skipped", error);
    }
  }
}
