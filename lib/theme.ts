export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'naqshlab-theme';

export const themeInitScript = `
  (function () {
    try {
      var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
      var theme = stored === 'light' || stored === 'dark' || stored === 'system'
        ? stored
        : 'system';
      var dark = theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var root = document.documentElement;
      root.classList.toggle('dark', dark);
      root.dataset.theme = theme;
      root.style.colorScheme = dark ? 'dark' : 'light';
    } catch (_) {}
  })();
`;
