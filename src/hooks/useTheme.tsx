import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface TelegramWebApp {
  colorScheme: 'light' | 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check if we're in Telegram first
    const tg = window.Telegram?.WebApp;
    if (tg) {
      return 'system'; // Default to system in Telegram
    }
    
    // For web users, check localStorage or default to system
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'system';
  });

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
      // For Telegram users, poll for theme changes
      const handleTelegramTheme = () => {
        setSystemTheme(tg.colorScheme);
      };
      
      // Initial check
      handleTelegramTheme();
      
      // Poll every second for theme changes
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

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme);
    
    // Only store theme preference for non-Telegram users
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      localStorage.setItem('theme', newTheme);
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