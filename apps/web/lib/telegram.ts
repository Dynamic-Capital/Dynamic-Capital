// Minimal helpers for Telegram WebApp API
type TelegramWebApp =
  | undefined
  | (typeof globalThis.Telegram.WebApp & {
    disableVerticalSwipes?: () => void;
  });

let telegramReadyHandled = false;

let cachedMainHandler: (() => void) | undefined;
let cachedBackHandler: (() => void) | undefined;

export function getTelegramWebApp(): TelegramWebApp {
  if (typeof window === "undefined") return undefined;
  const telegram =
    (window as unknown as { Telegram?: typeof globalThis.Telegram })
      .Telegram;
  return telegram?.WebApp as TelegramWebApp;
}

function waitForTelegramWebApp({
  interval = 30,
  timeout = 3000,
}: { interval?: number; timeout?: number } = {}) {
  if (typeof window === "undefined") {
    return Promise.resolve<TelegramWebApp>(undefined);
  }

  const existing = getTelegramWebApp();
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise<TelegramWebApp>((resolve) => {
    let settled = false;
    const cleanup = (
      opts: {
        intervalId?: number;
        timeoutId?: number;
        listeners?: Array<{ event: string; handler: () => void }>;
      } = {},
    ) => {
      if (opts.intervalId !== undefined) {
        window.clearInterval(opts.intervalId);
      }
      if (opts.timeoutId !== undefined) {
        window.clearTimeout(opts.timeoutId);
      }
      opts.listeners?.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };

    const tryResolve = () => {
      if (settled) return;
      const tg = getTelegramWebApp();
      if (!tg) return;
      settled = true;
      cleanup({ intervalId, timeoutId, listeners });
      resolve(tg);
    };

    const listeners = ["DOMContentLoaded", "load"].map((event) => {
      const handler = () => tryResolve();
      window.addEventListener(event, handler);
      return { event, handler };
    });

    const intervalId = window.setInterval(() => {
      tryResolve();
    }, interval);

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup({ intervalId, listeners });
      resolve(undefined);
    }, timeout);

    tryResolve();
  });
}

export async function initTelegram() {
  if (telegramReadyHandled) return;
  const tg = await waitForTelegramWebApp();
  if (!tg) return;
  if (telegramReadyHandled) return;
  telegramReadyHandled = true;
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
  const tg = getTelegramWebApp();
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
  const tg = getTelegramWebApp();
  if (!tg) return;
  const button = tg.MainButton;
  button.setText(text);
  button.show();
  if (onClick) {
    const handler = () => onClick();
    if (cachedMainHandler) {
      tg.offEvent?.("mainButtonClicked", cachedMainHandler);
    }
    cachedMainHandler = handler;
    tg.onEvent?.("mainButtonClicked", handler);
  } else {
    cachedMainHandler = undefined;
  }
}

export function hideMainButton() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  if (cachedMainHandler) {
    tg.offEvent?.("mainButtonClicked", cachedMainHandler);
    cachedMainHandler = undefined;
  }
  tg.MainButton?.hide();
}

export function showBackButton(cb?: () => void) {
  const tg = getTelegramWebApp();
  if (!tg) return () => {};
  const backButton = tg.BackButton;
  backButton.show();
  if (!cb) return () => {};
  const handler = () => cb();
  if (cachedBackHandler) {
    tg.offEvent?.("backButtonClicked", cachedBackHandler);
  }
  cachedBackHandler = handler;
  tg.onEvent?.("backButtonClicked", handler);
  return () => {
    if (cachedBackHandler) {
      tg.offEvent?.("backButtonClicked", cachedBackHandler);
      cachedBackHandler = undefined;
    }
  };
}

export function hideBackButton() {
  const tg = getTelegramWebApp();
  if (!tg) return;
  if (cachedBackHandler) {
    tg.offEvent?.("backButtonClicked", cachedBackHandler);
    cachedBackHandler = undefined;
  }
  tg.BackButton?.hide();
}

export function haptic(type: "light" | "medium" | "heavy" = "light") {
  try {
    getTelegramWebApp()?.HapticFeedback?.impactOccurred(type);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[tg] haptic skipped", error);
    }
  }
}
