import type { ReactNode } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommandPaletteProvider } from './command-palette-provider';
import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';
import { ThemeProvider } from './theme-provider';

/**
 * All app-wide providers in one place.
 * Add future providers (query client, auth, i18n, …) as sibling files in this folder
 * and compose them here, so `App.tsx` stays flat.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <QueryProvider>
          <CommandPaletteProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </CommandPaletteProvider>
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
