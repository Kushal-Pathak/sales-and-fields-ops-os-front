import { api } from '@/lib/api';
import type { ModuleId, Workspace } from '@/types/domain';
import type { CollectionOptions } from './collection';
import { isDemoData } from './index';
import { readRows, writeRows } from './local-store';

export interface SetModuleEnabledInput {
  id: ModuleId;
  enabled: boolean;
}

/** Changes one setting; concurrent admins must not replace each other's module list. */
export async function setModuleEnabled(
  { id, enabled }: SetModuleEnabledInput,
  options?: CollectionOptions,
): Promise<void> {
  if (!isDemoData) {
    await api.patch<void>(`/workspace/modules/${encodeURIComponent(id)}`, {
      ...options,
      body: { enabled },
    });
    return;
  }
  // No await between reading the latest demo row and writing this one field.
  options?.signal?.throwIfAborted();
  const rows = readRows<Workspace>('workspace') ?? [];
  const workspace = rows[0];
  if (!workspace) throw new Error('The workspace could not be found.');
  if (!workspace.modules.find((module) => module.id === id)?.configurable)
    throw new Error('This module cannot be switched.');
  const updated: Workspace = {
    ...workspace,
    modules: workspace.modules.map((module) =>
      module.id === id ? { ...module, enabled } : module,
    ),
    updatedAt: new Date().toISOString(),
  };
  writeRows(
    'workspace',
    rows.map((row) => (row.id === workspace.id ? updated : row)),
  );
}
