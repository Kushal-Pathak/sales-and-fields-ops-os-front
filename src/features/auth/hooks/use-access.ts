import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SessionContext } from '@/app/providers/session-context';
import { queryKeys } from '@/data';
import { access, type AccessContext } from '@/data/access';
import { getQueryError } from '@/data/query-state';
import { useCurrentUser } from '@/features/workspace';

export interface AccessQuery {
  /** `undefined` until the first answer arrives. Never a guess. */
  context: AccessContext | undefined;
  error: unknown;
  refetch: () => void;
}

/**
 * The signed-in user's resolved access: one cached request per session, refreshed
 * like any other query and whenever a role, a member's role or a module changes
 * (those mutations invalidate `queryKeys.access.all`). Prefer `useCan`, `useModule`
 * and `useFlag`; this is for the guards.
 */
export function useAccessContext(): AccessQuery {
  const session = useContext(SessionContext);
  const currentUser = useCurrentUser();
  // The session says who is signed in. Without a provider (page tests) follow `useCurrentUser`.
  const userId = session ? session.user?.id : currentUser.data?.id;
  const query = useQuery({
    queryKey: queryKeys.access.context(userId ?? ''),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error('No signed-in user.');
      return access.load(userId, { signal });
    },
    enabled: userId !== undefined,
  });
  return {
    context: query.data,
    error: getQueryError(session ? [query] : [query, currentUser]),
    refetch: () => {
      if (!session) void currentUser.refetch();
      if (userId) void query.refetch();
    },
  };
}
