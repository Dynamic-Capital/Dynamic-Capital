export interface TelegramUserRecord {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TelegramInitDataUnsafe {
  user?: TelegramUserRecord;
  [key: string]: unknown;
}

export interface TelegramButtonControl {
  show?: () => void;
  hide?: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
  [key: string]: unknown;
}

export interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: TelegramInitDataUnsafe;
  ready?: () => void;
  expand?: () => void;
  colorScheme?: "light" | "dark";
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  MainButton?: TelegramButtonControl;
  BackButton?: TelegramButtonControl;
  [key: string]: unknown;
}

export interface TelegramNamespace {
  WebApp?: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: TelegramNamespace;
  }
}

export {}; // Ensure this file is treated as a module.
