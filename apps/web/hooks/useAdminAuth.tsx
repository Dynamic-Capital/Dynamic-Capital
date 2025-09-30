"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramUserData {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface AdminAuthContextType {
  isAdmin: boolean;
  isVip: boolean;
  loading: boolean;
  checkAdminStatus: (telegramUserId?: string) => Promise<boolean>;
  syncUser: (telegramData?: TelegramUserData) => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const isBrowser = typeof window !== 'undefined';

  useEffect(() => {
    if (!isBrowser) {
      setLoading(false);
      return;
    }

    // Check for existing admin status in localStorage or session
    const storedAdminStatus = localStorage.getItem('isAdmin');
    const storedVipStatus = localStorage.getItem('isVip');

    if (storedAdminStatus) {
      setIsAdmin(JSON.parse(storedAdminStatus));
    }
    if (storedVipStatus) {
      setIsVip(JSON.parse(storedVipStatus));
    }

    setLoading(false);
  }, [isBrowser]);

  const checkAdminStatus = async (telegramUserId?: string): Promise<boolean> => {
    if (!telegramUserId) return false;
    
    try {
      // First check via Supabase RPC function
      const { data: adminData, error: adminError } = await supabase
        .rpc('is_telegram_admin', { telegram_user_id: telegramUserId });

      if (!adminError && adminData !== null) {
        setIsAdmin(adminData);
        if (isBrowser) {
          localStorage.setItem('isAdmin', JSON.stringify(adminData));
        }
        return adminData;
      }

      // Fallback to direct table query
      const { data: userData, error: userError } = await supabase
        .from('bot_users')
        .select('is_admin, is_vip')
        .eq('telegram_id', telegramUserId)
        .single();

      if (!userError && userData) {
        const adminStatus = userData.is_admin || false;
        const vipStatus = userData.is_vip || false;
        
        setIsAdmin(adminStatus);
        setIsVip(vipStatus);
        if (isBrowser) {
          localStorage.setItem('isAdmin', JSON.stringify(adminStatus));
          localStorage.setItem('isVip', JSON.stringify(vipStatus));
        }

        return adminStatus;
      }

      return false;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  };

  const syncUser = async (
    telegramData?: TelegramUserData,
  ): Promise<boolean> => {
    if (!telegramData) return false;

    try {
      const { data, error } = await supabase
        .from('bot_users')
        .upsert({
          telegram_id: telegramData.id?.toString(),
          first_name: telegramData.first_name,
          last_name: telegramData.last_name,
          username: telegramData.username,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'telegram_id'
        })
        .select()
        .single();

      if (!error && data) {
        setIsAdmin(data.is_admin || false);
        setIsVip(data.is_vip || false);
        if (isBrowser) {
          localStorage.setItem('isAdmin', JSON.stringify(data.is_admin || false));
          localStorage.setItem('isVip', JSON.stringify(data.is_vip || false));
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error syncing user:', error);
      return false;
    }
  };

  const value = {
    isAdmin,
    isVip,
    loading,
    checkAdminStatus,
    syncUser,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}