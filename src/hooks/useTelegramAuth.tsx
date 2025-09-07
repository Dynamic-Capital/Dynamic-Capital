import { useState, useEffect, createContext, useContext } from 'react';

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
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

export function TelegramAuthProvider({ children }: { children: React.ReactNode }) {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initData, setInitData] = useState<string | null>(null);

  useEffect(() => {
    // Check if running in Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Get Telegram init data
      const telegramInitData = tg.initData;
      setInitData(telegramInitData);
      
      if (telegramInitData && tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user as TelegramUser;
        setTelegramUser(user);
        
        // Auto-verify and check admin status
        verifyAndCheckStatus(user.id.toString(), telegramInitData);
      } else {
        setLoading(false);
      }
    } else {
      // Not running in Telegram Web App
      setLoading(false);
    }
  }, []);

  const verifyAndCheckStatus = async (userId: string, initDataString: string) => {
    try {
      // Verify telegram auth
      const verified = await verifyTelegramAuth(initDataString);
      
      if (verified) {
        // Check admin status
        const adminStatus = await checkAdminStatus(userId);
        setIsAdmin(adminStatus);
        
        // Check VIP status
        const vipStatus = await checkVipStatus(userId);
        setIsVip(vipStatus);
      }
    } catch (error) {
      console.error('Failed to verify telegram auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyTelegramAuth = async (initDataString?: string): Promise<boolean> => {
    try {
      const dataToVerify = initDataString || initData;
      if (!dataToVerify) return false;

      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/verify-initdata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initData: dataToVerify
        })
      });

      const result = await response.json();
      return result.ok === true;
    } catch (error) {
      console.error('Failed to verify telegram auth:', error);
      return false;
    }
  };

  const checkAdminStatus = async (userId?: string): Promise<boolean> => {
    try {
      const userIdToCheck = userId || telegramUser?.id?.toString();
      if (!userIdToCheck) return false;

      // Check if user is the hardcoded admin first
      const isHardcodedAdmin = userIdToCheck === '225513686';
      if (isHardcodedAdmin) {
        setIsAdmin(true);
        return true;
      }

      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/admin-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_user_id: userIdToCheck
        })
      });

      const result = await response.json();
      const adminStatus = result.is_admin === true;
      setIsAdmin(adminStatus);
      return adminStatus;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  };

  const checkVipStatus = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch('https://qeejuomcapbdlhnjqjcc.functions.supabase.co/miniapp-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: userId
        })
      });

      const result = await response.json();
      return result.vip?.is_vip === true;
    } catch (error) {
      console.error('Failed to check VIP status:', error);
      return false;
    }
  };

  const value: TelegramAuthContextType = {
    telegramUser,
    isAdmin,
    isVip,
    loading,
    initData,
    verifyTelegramAuth,
    checkAdminStatus
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