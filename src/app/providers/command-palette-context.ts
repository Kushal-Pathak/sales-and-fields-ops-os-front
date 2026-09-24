import { createContext } from 'react';

export interface CommandPaletteContextValue {
  open: boolean;
  /** Text to start the palette with (e.g. from a "Ask AI" chip with a prefilled question). */
  initialQuery: string;
  openPalette: (query?: string) => void;
  closePalette: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);
