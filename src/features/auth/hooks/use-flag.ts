import { flagDefaults, FLAGS, type FlagKey } from '@/lib/flags';
import { useAccessContext } from './use-access';

/**
 * Whether a feature flag is on. The key must be declared in `src/lib/flags.ts`.
 * Before access has loaded, and for a flag the backend does not mention, this is
 * the flag's declared default.
 */
export function useFlag(key: FlagKey): boolean {
  return useAccessContext().context?.flags[key] ?? FLAGS[key].default;
}

const DEFAULTS = flagDefaults();

/** Every flag, resolved. For code that reasons about flags as a set; prefer `useFlag` for one. */
export function useFlags(): Record<FlagKey, boolean> {
  return useAccessContext().context?.flags ?? DEFAULTS;
}
