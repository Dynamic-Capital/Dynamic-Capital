import { useEffect } from 'react';

interface TelegramWebApp {
  colorScheme: 'light' | 'dark';
}

export function useThemeSync() {
  useEffect(() => {
    const applyTheme = (isDark: boolean) => {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    // Check if we're in Telegram
    const tg = window.Telegram?.WebApp;
    if (tg) {
      // Use Telegram's theme
      applyTheme(tg.colorScheme === 'dark');
      
      // Listen for theme changes in Telegram
      const handleThemeChange = () => {
        applyTheme(tg.colorScheme === 'dark');
      };
      
      // Telegram doesn't provide theme change events, but we can poll
      const interval = setInterval(handleThemeChange, 1000);
      return () => clearInterval(interval);
    } else {
      // Use system preference for web users
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      applyTheme(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);
}