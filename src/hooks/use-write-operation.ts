import { useContext, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SessionContext } from '@/app/providers/session-context';
import type { Db } from '@/data';
import type { CollectionOptions } from '@/data/collection';
import { getModuleWriteSignal } from '@/data/module-write-scope';
import type { ModuleId } from '@/types/domain';
import { getDataSessionSignal } from '@/data/session-scope';
import { captureWriteSignal, runWriteOperation } from '@/data/write-operation';

/** Infrastructure only: feature hooks still own their commands, mutations and cache updates. */
export function useWriteOperation(module?: ModuleId) {
  const client = useQueryClient();
  const session = useContext(SessionContext);
  const signal = session?.dataSignal ?? getDataSessionSignal();
  const moduleSignal = module ? getModuleWriteSignal(client, module) : undefined;
  return useMemo(() => {
    const writeSignal = captureWriteSignal(
      moduleSignal ? AbortSignal.any([signal, moduleSignal]) : signal,
    );
    const write = <T>(operation: (database: Db, options: CollectionOptions) => Promise<T>) =>
      runWriteOperation(writeSignal, (database) => operation(database, { signal: writeSignal }));
    return Object.assign(write, { signal: writeSignal });
  }, [signal, moduleSignal]);
}
