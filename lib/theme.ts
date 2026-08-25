export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'naqshlab-theme';

export function readStoredTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system'
      ? stored
      : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const root = document.documentElement;

  root.classList.toggle('dark', isDark);
  root.dataset.theme = theme;
  root.style.colorScheme = isDark ? 'dark' : 'light';
}
