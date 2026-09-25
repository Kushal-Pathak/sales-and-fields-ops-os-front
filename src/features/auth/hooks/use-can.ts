import { useCurrentUser, useRoles } from '@/features/workspace';
import type { Permission } from '@/types/domain';

/**
 * Whether the signed-in user's role grants `permission`. `false` while loading.
 * This only shapes the UI; the backend must enforce the same rule on its side.
 */
export function useCan(permission: Permission): boolean {
  const user = useCurrentUser().data;
  const roles = useRoles().data;
  if (!user || !roles) return false;
  const role = roles.find((row) => row.id === user.roleId);
  return role?.permissions.includes(permission) ?? false;
}
