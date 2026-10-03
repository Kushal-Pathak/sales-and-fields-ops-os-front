import type { QueryClient } from '@tanstack/react-query';
import type { ModuleId } from '@/types/domain';
import { AccessRevokedError } from './errors';

// Separate clients belong to separate sessions. A reopened module gets a new scope;
// its old requests keep the aborted signal even if access is granted again.
const scopes = new WeakMap<QueryClient, Map<ModuleId, AbortController>>();

function moduleScopes(client: QueryClient) {
  let entries = scopes.get(client);
  if (!entries) {
    entries = new Map();
    scopes.set(client, entries);
  }
  return entries;
}

export function getModuleWriteSignal(client: QueryClient, module: ModuleId): AbortSignal {
  const entries = moduleScopes(client);
  let controller = entries.get(module);
  if (!controller) {
    controller = new AbortController();
    entries.set(module, controller);
  }
  return controller.signal;
}

export function setModuleWriteAccess(
  client: QueryClient,
  module: ModuleId,
  allowed: boolean,
): void {
  const entries = moduleScopes(client);
  const signal = getModuleWriteSignal(client, module);
  if (!allowed) entries.get(module)?.abort(new AccessRevokedError());
  else if (signal.aborted) entries.set(module, new AbortController());
}
