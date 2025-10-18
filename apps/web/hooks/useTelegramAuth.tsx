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
  adminSession: { userId?: string; exp?: number } | null;
  validatingAdminSession: boolean;
  adminSessionError: string | null;
  verifyTelegramAuth: () => Promise<boolean>;
  checkAdminStatus: (
    userId?: string,
    initDataOverride?: string,
  ) => Promise<boolean>;
  refreshAdminSession: () => Promise<{ ok: boolean; error?: string }>;
  establishAdminSession: (
    input: { initData?: string; token?: string },
    options?: { silent?: boolean },
  ) => Promise<{ ok: boolean; error?: string }>;
  clearAdminSession: () => Promise<void>;
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
  const [adminSession, setAdminSession] = useState<
    { userId?: string; exp?: number } | null
  >(null);
  const [validatingAdminSession, setValidatingAdminSession] = useState(false);
  const [adminSessionError, setAdminSessionError] = useState<string | null>(
    null,
  );

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

  const establishAdminSession = useCallback(
    async (
      input: { initData?: string; token?: string },
      options: { silent?: boolean } = {},
    ): Promise<{ ok: boolean; error?: string }> => {
      const { silent = false } = options;
      if (!silent) {
        setValidatingAdminSession(true);
        setAdminSessionError(null);
      }

      try {
        const response = await fetch("/api/admin/session", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });

        let data: Record<string, unknown> = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          const message = typeof data?.error === "string"
            ? data.error
            : response.status === 401
            ? "Admin session rejected"
            : "Failed to establish admin session";
          setAdminSession(null);
          setIsAdmin(false);
          if (!silent) {
            setAdminSessionError(message);
          }
          return { ok: false, error: message };
        }

        const userIdValue = data?.userId ?? data?.user_id;
        const expValue = data?.exp;
        setAdminSession({
          userId: typeof userIdValue === "string" ? userIdValue : undefined,
          exp: typeof expValue === "number" ? expValue : undefined,
        });
        setAdminSessionError(null);
        setIsAdmin(true);
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Failed to establish admin session";
        console.error("Failed to establish admin session:", error);
        setAdminSession(null);
        setIsAdmin(false);
        if (!silent) {
          setAdminSessionError(message);
        }
        return { ok: false, error: message };
      } finally {
        if (!silent) {
          setValidatingAdminSession(false);
        }
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
          if (adminStatus) {
            await establishAdminSession({ initData: initDataString }, {
              silent: true,
            });
          }
          const vipStatus = await checkVipStatus(userId);
          setIsVip(vipStatus);
        }
      } catch (error) {
        console.error("Failed to verify telegram auth:", error);
      } finally {
        setLoading(false);
      }
    },
    [
      verifyTelegramAuth,
      syncUser,
      checkAdminStatus,
      checkVipStatus,
      establishAdminSession,
    ],
  );

  const refreshAdminSession = useCallback(
    async (): Promise<{ ok: boolean; error?: string }> => {
      setValidatingAdminSession(true);
      try {
        const response = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" },
        });

        let data: Record<string, unknown> = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          const message = typeof data?.error === "string"
            ? data.error
            : response.status === 401
            ? "Admin session expired"
            : "Failed to verify admin session";
          setAdminSession(null);
          setIsAdmin(false);
          setAdminSessionError(message);
          return { ok: false, error: message };
        }

        const userIdValue = data?.userId ?? data?.user_id;
        const expValue = data?.exp;
        setAdminSession({
          userId: typeof userIdValue === "string" ? userIdValue : undefined,
          exp: typeof expValue === "number" ? expValue : undefined,
        });
        setAdminSessionError(null);
        setIsAdmin(true);
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Failed to verify admin session";
        console.error("Failed to refresh admin session:", error);
        setAdminSession(null);
        setIsAdmin(false);
        setAdminSessionError(message);
        return { ok: false, error: message };
      } finally {
        setValidatingAdminSession(false);
      }
    },
    [],
  );

  const clearAdminSession = useCallback(async () => {
    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("Failed to clear admin session:", error);
    } finally {
      setAdminSession(null);
      setAdminSessionError(null);
      setIsAdmin(false);
    }
  }, []);

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
    void refreshAdminSession();
  }, [refreshAdminSession]);

  const value: TelegramAuthContextType = {
    telegramUser,
    isAdmin,
    isVip,
    loading,
    initData,
    adminSession,
    validatingAdminSession,
    adminSessionError,
    verifyTelegramAuth,
    checkAdminStatus,
    refreshAdminSession,
    establishAdminSession,
    clearAdminSession,
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
