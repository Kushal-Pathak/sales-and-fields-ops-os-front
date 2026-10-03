import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import { parseAccessContext } from '@/data/access';
import { isAccessError } from '@/data/errors';
import { setModuleWriteAccess } from '@/data/module-write-scope';
import { MODULE_IDS } from '@/types/domain';
import { MODULES } from './modules';
import { resolveModule } from './resolve-access';

/** Reconcile before React renders or a late mutation can write its result into the cache. */
export function watchAccess(client: QueryClient): () => void {
  const reconcile = (data: unknown) => {
    const context = data === undefined ? undefined : parseAccessContext(data);
    for (const id of MODULE_IDS) {
      const allowed = context !== undefined && resolveModule(id, context).status === 'allowed';
      setModuleWriteAccess(client, id, allowed);
      if (!allowed)
        for (const collection of MODULES[id].collections)
          client.removeQueries({ queryKey: queryKeys[collection].all });
    }
  };
  const cache = client.getQueryCache();
  for (const query of cache.findAll({ queryKey: queryKeys.access.all }))
    if (isAccessError(query.state.error)) reconcile(undefined);
    else if (query.state.data !== undefined) reconcile(query.state.data);
  return cache.subscribe((event) => {
    if (event.type !== 'updated' || event.query.queryKey[0] !== queryKeys.access.all[0]) return;
    if (event.action.type === 'success') reconcile(event.query.state.data);
    else if (event.action.type === 'error' && isAccessError(event.query.state.error))
      reconcile(undefined);
  });
}
