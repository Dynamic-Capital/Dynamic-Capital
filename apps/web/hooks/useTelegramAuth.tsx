"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { buildFunctionUrl, callEdgeFunction } from "@/config/supabase";
import {
  AdminCheckResponse,
  VerifyInitDataResponse,
  VipStatusResponse,
} from "@/types/api";

const ADMIN_STORAGE_KEY = "dc_admin_token";

export async function validateAdminToken(token: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production" && token === "ADMIN") {
    return true;
  }

  const { data, error } = await callEdgeFunction<AdminCheckResponse>(
    "ADMIN_CHECK",
    {
      method: "GET",
      token,
    },
  );

  if (error) {
    if (error.status >= 400 && error.status < 500) {
      return false;
    }

    throw new Error(error.message);
  }

  return data?.ok === true || data?.is_admin === true;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramAuthContextType {
  telegramUser: TelegramUser | null;
  isAdmin: boolean;
  isVip: boolean;
  loading: boolean;
  initData: string | null;
  validatedAdminToken: string | null;
  validatingAdminToken: boolean;
  adminTokenError: string | null;
  verifyTelegramAuth: () => Promise<boolean>;
  checkAdminStatus: (
    userId?: string,
    initDataOverride?: string,
  ) => Promise<boolean>;
  refreshValidatedAdminToken: (
    token?: string,
  ) => Promise<{ valid: boolean; error?: string }>;
  getAdminAuth: () => { initData?: string; token?: string } | null;
}

interface TelegramButtonControl {
  show?: () => void;
  hide?: () => void;
  onClick?: (handler: () => void) => void;
  offClick?: (handler: () => void) => void;
  [key: string]: unknown;
}

interface TelegramInitDataUnsafe {
  user?: TelegramUser;
  [key: string]: unknown;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramInitDataUnsafe;
  ready: () => void;
  expand: () => void;
  colorScheme: "light" | "dark";
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
  MainButton: TelegramButtonControl;
  BackButton: TelegramButtonControl;
  [key: string]: unknown;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(
  undefined,
);

export function TelegramAuthProvider(
  { children }: { children: React.ReactNode },
) {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<string | null>(null);
  const [validatedAdminToken, setValidatedAdminToken] = useState<string | null>(
    null,
  );
  const [validatingAdminToken, setValidatingAdminToken] = useState(false);
  const [adminTokenError, setAdminTokenError] = useState<string | null>(null);

  const verifyTelegramAuth = useCallback(
    async (initDataString?: string): Promise<boolean> => {
      const dataToVerify = initDataString || initData;
      if (!dataToVerify) return false;

      const { data, error } = await callEdgeFunction<VerifyInitDataResponse>(
        "VERIFY_INITDATA",
        {
          method: "POST",
          body: { initData: dataToVerify },
        },
      );

      if (error) {
        console.error("Failed to verify telegram auth:", error.message);
        return false;
      }

      return data?.ok === true;
    },
    [initData],
  );

  const checkAdminStatus = useCallback(async (
    userId?: string,
    initDataOverride?: string,
  ): Promise<boolean> => {
    const userIdToCheck = userId || telegramUser?.id?.toString();
    if (!userIdToCheck) return false;

    const initDataPayload = initDataOverride ?? initData;

    let data: AdminCheckResponse | undefined;
    let error;
    if (initDataPayload) {
      ({ data, error } = await callEdgeFunction<AdminCheckResponse>(
        "ADMIN_CHECK",
        {
          method: "POST",
          body: { initData: initDataPayload },
        },
      ));
    } else {
      ({ data, error } = await callEdgeFunction<AdminCheckResponse>(
        "ADMIN_CHECK",
        {
          method: "POST",
          body: { telegram_user_id: userIdToCheck },
        },
      ));
    }

    if (error) {
      console.error("Failed to check admin status:", error.message);
      return false;
    }

    const adminStatus = initDataPayload
      ? data?.ok === true
      : data?.is_admin === true;
    setIsAdmin(adminStatus);
    return adminStatus;
  }, [initData, telegramUser]);

  const checkVipStatus = useCallback(
    async (userId: string): Promise<boolean> => {
      const { data, error } = await callEdgeFunction<VipStatusResponse>(
        "MINIAPP_HEALTH",
        {
          method: "POST",
          body: { telegram_id: userId },
        },
      );

      if (error) {
        console.error("Failed to check VIP status:", error.message);
        return false;
      }

      return data?.vip?.is_vip === true;
    },
    [],
  );

  const syncUser = useCallback(
    async (initDataString: string): Promise<void> => {
      try {
        await fetch(`${buildFunctionUrl("MINIAPP")}/api/sync-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData: initDataString,
          }),
        });
      } catch (error) {
        console.error("Failed to sync user:", error);
      }
    },
    [],
  );

  const verifyAndCheckStatus = useCallback(
    async (userId: string, initDataString: string) => {
      try {
        const verified = await verifyTelegramAuth(initDataString);

        if (verified) {
          await syncUser(initDataString);
          const adminStatus = await checkAdminStatus(userId, initDataString);
          setIsAdmin(adminStatus);
          const vipStatus = await checkVipStatus(userId);
          setIsVip(vipStatus);
        }
      } catch (error) {
        console.error("Failed to verify telegram auth:", error);
      } finally {
        setLoading(false);
      }
    },
    [verifyTelegramAuth, syncUser, checkAdminStatus, checkVipStatus],
  );

  const refreshValidatedAdminToken = useCallback(
    async (token?: string): Promise<{ valid: boolean; error?: string }> => {
      const tokenToCheck = token ?? localStorage.getItem(ADMIN_STORAGE_KEY);

      if (!tokenToCheck) {
        setValidatedAdminToken(null);
        setAdminTokenError(null);
        setIsAdmin(false);
        setValidatingAdminToken(false);
        return { valid: false };
      }

      setValidatingAdminToken(true);
      setAdminTokenError(null);

      try {
        const isValid = await validateAdminToken(tokenToCheck);

        if (!isValid) {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
          setValidatedAdminToken(null);
          setIsAdmin(false);
          const message = "Admin token rejected";
          setAdminTokenError(message);
          return { valid: false, error: message };
        }

        localStorage.setItem(ADMIN_STORAGE_KEY, tokenToCheck);
        setValidatedAdminToken(tokenToCheck);
        setIsAdmin(true);
        return { valid: true };
      } catch (error) {
        console.error("Failed to validate admin token:", error);
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        setValidatedAdminToken(null);
        setIsAdmin(false);
        const message = error instanceof Error
          ? error.message
          : "Failed to validate admin token";
        setAdminTokenError(message);
        return { valid: false, error: message };
      } finally {
        setValidatingAdminToken(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (globalThis.Telegram?.WebApp) {
      const tg = globalThis.Telegram.WebApp;
      const telegramInitData = tg.initData;
      setInitData(telegramInitData);

      if (telegramInitData && tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user as TelegramUser;
        setTelegramUser(user);
        verifyAndCheckStatus(user.id.toString(), telegramInitData);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [verifyAndCheckStatus]);

  useEffect(() => {
    void refreshValidatedAdminToken();
  }, [refreshValidatedAdminToken]);

  const getAdminAuth = () => {
    if (validatedAdminToken) {
      return { token: validatedAdminToken };
    }

    if (initData) {
      return { initData };
    }

    return null;
  };

  const value: TelegramAuthContextType = {
    telegramUser,
    isAdmin,
    isVip,
    loading,
    initData,
    validatedAdminToken,
    validatingAdminToken,
    adminTokenError,
    verifyTelegramAuth,
    checkAdminStatus,
    refreshValidatedAdminToken,
    getAdminAuth,
  };

  return (
    <TelegramAuthContext.Provider value={value}>
      {children}
    </TelegramAuthContext.Provider>
  );
}

export function useTelegramAuth() {
  const context = useContext(TelegramAuthContext);
  if (context === undefined) {
    throw new Error(
      "useTelegramAuth must be used within a TelegramAuthProvider",
    );
  }
  return context;
}

// Type declaration for window.Telegram
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
