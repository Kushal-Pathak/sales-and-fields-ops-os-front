import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { User } from '@/types/domain';

/**
 * The signed-in user. Stand-in until auth exists: the first active user of the
 * workspace. Auth replaces this hook's implementation, not its callers.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => db.users.list(),
    select: (rows: User[]) => rows.find((user) => user.active),
  });
}
