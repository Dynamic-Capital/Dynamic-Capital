import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { callEdgeFunction, buildFunctionUrl } from '@/config/supabase';

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
  verifyTelegramAuth: () => Promise<boolean>;
  checkAdminStatus: () => Promise<boolean>;
  getAdminAuth: () => { initData?: string; token?: string } | null;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

export function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<string | null>(null);

  const verifyTelegramAuth = useCallback(async (initDataString?: string): Promise<boolean> => {
    try {
      const dataToVerify = initDataString || initData;
      if (!dataToVerify) return false;

      const { data } = await callEdgeFunction('VERIFY_INITDATA', {
        method: 'POST',
        body: { initData: dataToVerify },
      });
      return (data as any)?.ok === true;
    } catch (error) {
      console.error('Failed to verify telegram auth:', error);
      return false;
    }
  }, [initData]);

  const checkAdminStatus = useCallback(async (userId?: string): Promise<boolean> => {
    try {
      const userIdToCheck = userId || telegramUser?.id?.toString();
      if (!userIdToCheck) return false;

      if (initData) {
        const { data } = await callEdgeFunction('ADMIN_CHECK', {
          method: 'POST',
          body: { initData: initData },
        });

        const adminStatus = (data as any)?.ok === true;
        setIsAdmin(adminStatus);
        return adminStatus;
      } else {
        const { data } = await callEdgeFunction('ADMIN_CHECK', {
          method: 'POST',
          body: { telegram_user_id: userIdToCheck },
        });

        const adminStatus = (data as any)?.is_admin === true;
        setIsAdmin(adminStatus);
        return adminStatus;
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }, [initData, telegramUser]);

  const checkVipStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data } = await callEdgeFunction('MINIAPP_HEALTH', {
        method: 'POST',
        body: { telegram_id: userId },
      });

      return (data as any)?.vip?.is_vip === true;
    } catch (error) {
      console.error('Failed to check VIP status:', error);
      return false;
    }
  }, []);

  const syncUser = useCallback(async (initDataString: string): Promise<void> => {
    try {
      await fetch(`${buildFunctionUrl('MINIAPP')}/api/sync-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: initDataString,
        }),
      });
    } catch (error) {
      console.error('Failed to sync user:', error);
    }
  }, []);

  const verifyAndCheckStatus = useCallback(async (userId: string, initDataString: string) => {
    try {
      const verified = await verifyTelegramAuth(initDataString);

      if (verified) {
        await syncUser(initDataString);
        const adminStatus = await checkAdminStatus(userId);
        setIsAdmin(adminStatus);
        const vipStatus = await checkVipStatus(userId);
        setIsVip(vipStatus);
      }
    } catch (error) {
      console.error('Failed to verify telegram auth:', error);
    } finally {
      setLoading(false);
    }
  }, [verifyTelegramAuth, syncUser, checkAdminStatus, checkVipStatus]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
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

  const getAdminAuth = () => {
    // Check for stored admin token
    const token = localStorage.getItem('dc_admin_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp > Date.now() / 1000 && payload.admin) {
          return { token };
        }
        // Token expired, remove it
        localStorage.removeItem('dc_admin_token');
      } catch {
        localStorage.removeItem('dc_admin_token');
      }
    }
    
    // Use initData if available
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
    verifyTelegramAuth,
    checkAdminStatus,
    getAdminAuth
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
    throw new Error('useTelegramAuth must be used within a TelegramAuthProvider');
  }
  return context;
}

// Type declaration for window.Telegram
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          [key: string]: any;
        };
        ready: () => void;
        expand: () => void;
        MainButton: any;
        BackButton: any;
        [key: string]: any;
      };
    };
  }
}