import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CommandPaletteContext } from './command-palette-context';

/**
 * Open state for the global command palette and the ⌘K / Ctrl-K shortcut. The
 * palette itself (`features/command-palette`) is mounted by the app shell because
 * it needs the router; read this with `useCommandPalette()` from `@/hooks`.
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');

  const openPalette = useCallback((query = '') => {
    setInitialQuery(query);
    setOpen(true);
  }, []);
  const closePalette = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setInitialQuery('');
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ open, initialQuery, openPalette, closePalette }),
    [open, initialQuery, openPalette, closePalette],
  );

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}
