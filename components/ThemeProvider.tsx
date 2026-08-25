'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import {
  applyTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme';

type ThemeContextValue = {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const setTheme = useCallback((theme: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Theme switching should still work when storage is unavailable.
    }
    applyTheme(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(
      document.documentElement.classList.contains('dark') ? 'light' : 'dark'
    );
  }, [setTheme]);

  useEffect(() => {
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => {
      if (readStoredTheme() === 'system') applyTheme('system');
    };
    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyTheme(readStoredTheme());
    };

    applyTheme(readStoredTheme());
    colorScheme.addEventListener('change', syncSystemTheme);
    window.addEventListener('storage', syncStoredTheme);

    return () => {
      colorScheme.removeEventListener('change', syncSystemTheme);
      window.removeEventListener('storage', syncStoredTheme);
    };
  }, []);

  const value = useMemo(
    () => ({ setTheme, toggleTheme }),
    [setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
