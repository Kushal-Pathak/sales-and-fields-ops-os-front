import { useContext } from 'react';
import {
  CommandPaletteContext,
  type CommandPaletteContextValue,
} from '@/app/providers/command-palette-context';

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error(
      'useCommandPalette must be used within <CommandPaletteProvider> (see src/app/providers/index.tsx)',
    );
  }
  return context;
}
