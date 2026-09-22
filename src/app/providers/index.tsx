import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';

/**
 * All app-wide providers in one place.
 * Add future providers (query client, auth, i18n, …) as sibling files in this folder
 * and compose them here, so `App.tsx` stays flat.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
