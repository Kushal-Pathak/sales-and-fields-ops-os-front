import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import type { AccessContext } from '@/data/access';
import { flagDefaults } from '@/lib/flags';
import { MODULE_IDS, PERMISSION_KEYS } from '@/types/domain';

/** An access context with every module, permission and default flag; override what a test closes. */
export function fullAccess(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    workspaceId: 'default',
    revision: 'test',
    permissions: [...PERMISSION_KEYS],
    modules: [...MODULE_IDS],
    flags: flagDefaults(),
    ...overrides,
  };
}

/** Puts `context` in the cache for `userId`, so hooks see resolved access on their first render. */
export function seedAccess(
  client: QueryClient,
  userId: string,
  context: AccessContext = fullAccess(),
): void {
  client.setQueryData(queryKeys.access.context(userId), context);
}
