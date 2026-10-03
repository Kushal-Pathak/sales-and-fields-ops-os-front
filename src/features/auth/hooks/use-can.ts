import type { Permission } from '@/types/domain';
import { useAccessContext } from './use-access';

/**
 * Whether the signed-in user's role grants `permission`. `false` until access has loaded.
 * This only shapes the UI; the backend must enforce the same rule on its side.
 */
export function useCan(permission: Permission): boolean {
  return useAccessContext().context?.permissions.includes(permission) ?? false;
}
