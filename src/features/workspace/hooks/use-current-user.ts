import { useCallback, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SessionContext } from '@/app/providers/session-context';
import { db, queryKeys } from '@/data';
import type { User } from '@/types/domain';

/**
 * The signed-in user, as a query over `users` so callers keep `.data` / `.isPending`.
 * The row comes from the session; without a `SessionProvider` (unit tests render
 * pages alone) it falls back to the first active member.
 */
export function useCurrentUser() {
  const session = useContext(SessionContext);
  const sessionUserId = session?.user?.id ?? null;
  const fallback = session === null;
  const select = useCallback(
    (rows: User[]) =>
      sessionUserId
        ? rows.find((user) => user.id === sessionUserId)
        : fallback
          ? rows.find((user) => user.active)
          : undefined,
    [sessionUserId, fallback],
  );
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: ({ signal }) => db.users.list({ signal }),
    select,
  });
}
