import { useEffect, useState } from 'react';
import { callEdgeFunction } from '@/config/supabase';
import { useAuth } from './useAuth';

type Theme = 'light' | 'dark' | 'system';

interface TelegramWebApp {
  colorScheme: 'light' | 'dark';
}

export function useTheme() {
  const { session } = useAuth();
  const [theme, setTheme] = useState<Theme>('system');

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    
    const tg = window.Telegram?.WebApp;
    if (tg) {
      return tg.colorScheme;
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const currentTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const fetchTheme = async () => {
      const tg = window.Telegram?.WebApp;
      if (session?.access_token) {
        try {
          const res = await callEdgeFunction('THEME_GET', {
            token: session.access_token,
          });
          if (res.ok) {
            const data = await res.json();
            const mode = data.mode;
            setTheme(mode === 'auto' ? 'system' : mode);
            return;
          }
        } catch {
          /* ignore */
        }
      }

      if (!tg) {
        const stored = localStorage.getItem('theme') as Theme;
        setTheme(stored || 'system');
      } else {
        setTheme('system');
      }
    };

    fetchTheme();
  }, [session]);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply the theme
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      // For Telegram users, prefer the WebApp event API
      const handleTelegramTheme = () => {
        setSystemTheme(tg.colorScheme);
      };

      // Initial check
      handleTelegramTheme();

      if (typeof tg.onEvent === 'function') {
        tg.onEvent('themeChanged', handleTelegramTheme);
        return () => {
          tg.offEvent?.('themeChanged', handleTelegramTheme);
        };
      }

      // Fallback to polling if onEvent is unavailable
      const interval = setInterval(handleTelegramTheme, 1000);
      return () => clearInterval(interval);
    } else {
      // For web users, listen to system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };
      
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, []);

  const setThemeMode = async (newTheme: Theme) => {
    setTheme(newTheme);

    const tg = window.Telegram?.WebApp;
    if (session?.access_token) {
      try {
        await callEdgeFunction('THEME_SAVE', {
          method: 'POST',
          token: session.access_token,
          body: { mode: newTheme === 'system' ? 'auto' : newTheme },
        });
      } catch {
        /* ignore */
      }
    } else if (!tg) {
      try {
        localStorage.setItem('theme', newTheme);
      } catch {
        /* ignore */
      }
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setThemeMode('dark');
    } else if (theme === 'dark') {
      setThemeMode('system');
    } else {
      setThemeMode('light');
    }
  };

  const isInTelegram = typeof window !== 'undefined' && window.Telegram?.WebApp;

  return {
    theme,
    currentTheme,
    systemTheme,
    setTheme: setThemeMode,
    toggleTheme,
    isInTelegram
  };
}