import { useReducer } from 'react';
import type { ParsedTable } from '@/lib/csv';
import { autoMap, emptyMapping, type Mapping } from '../utils/column-mapping';
import type { ImportSettings } from '../utils/import-plan';

export const IMPORT_STEPS = ['Upload', 'Map columns', 'Check', 'Settings', 'Import'] as const;

export interface WizardState {
  step: number;
  fileName: string | null;
  table: ParsedTable | null;
  mapping: Mapping;
  /** `null` until the settings step first renders and seeds the defaults. */
  settings: ImportSettings | null;
}

type Action =
  | { type: 'load'; table: ParsedTable; fileName: string }
  | { type: 'clear' }
  | { type: 'mapping'; mapping: Mapping }
  | { type: 'settings'; settings: ImportSettings }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'reset' };

const initial: WizardState = {
  step: 0,
  fileName: null,
  table: null,
  mapping: emptyMapping(),
  settings: null,
};

function reduce(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        table: action.table,
        fileName: action.fileName,
        mapping: autoMap(action.table.headers),
      };
    case 'clear':
      return { ...state, table: null, fileName: null, mapping: emptyMapping() };
    case 'mapping':
      return { ...state, mapping: action.mapping };
    case 'settings':
      return { ...state, settings: action.settings };
    case 'next':
      return { ...state, step: Math.min(IMPORT_STEPS.length - 1, state.step + 1) };
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) };
    case 'reset':
      return initial;
  }
}

/**
 * The wizard's state lives in memory, not the URL: its payload is the file the
 * user just loaded, and a refresh legitimately starts over.
 */
export function useImportWizard() {
  const [state, dispatch] = useReducer(reduce, initial);
  return { state, dispatch };
}
