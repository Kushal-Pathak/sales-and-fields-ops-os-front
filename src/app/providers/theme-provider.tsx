import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ResolvedTheme, type Theme } from './theme-context';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // Storage can be unavailable (private mode, blocked). Fall back to system.
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/**
 * Applies the `.dark` class on `<html>` (see `@custom-variant dark` in styles/index.css)
 * and persists the user's choice. Read it with `useTheme()` from `@/hooks/use-theme`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === 'system' ? systemTheme() : theme,
  );

  useEffect(() => {
    const apply = (resolved: ResolvedTheme) => {
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      setResolvedTheme(resolved);
    };

    if (theme !== 'system') {
      apply(theme);
      return;
    }

    apply(systemTheme());
    const media = window.matchMedia(DARK_QUERY);
    const onChange = () => apply(systemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Ignore storage failures; the theme still applies for this session.
        }
        setThemeState(next);
      },
    }),
    [theme, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
