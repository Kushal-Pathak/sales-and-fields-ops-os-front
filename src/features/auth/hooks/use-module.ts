import { useMemo } from 'react';
import { MODULE_IDS, type ModuleId } from '@/types/domain';
import { resolveModules, type ModuleState } from '../utils/resolve-access';
import { useAccessContext } from './use-access';

const LOADING: ModuleState = { status: 'loading' };

/** Every module's state for the signed-in user; `loading` until access has loaded. */
export function useModules(): Record<ModuleId, ModuleState> {
  const { context } = useAccessContext();
  return useMemo(() => {
    if (context) return resolveModules(context);
    const loading = {} as Record<ModuleId, ModuleState>;
    for (const id of MODULE_IDS) loading[id] = LOADING;
    return loading;
  }, [context]);
}

/**
 * Whether the signed-in user may use a module: `allowed`, `denied` (with the reason) or
 * `loading`. Gate UI on `status === 'allowed'`, and gate queries with it too
 * (`enabled`, plus `moduleRows`) so a closed module is neither fetched nor shown.
 */
export function useModule(id: ModuleId): ModuleState {
  return useModules()[id];
}
