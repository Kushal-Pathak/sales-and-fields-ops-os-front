import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorState } from '@/components/common/empty-state';
import { queryKeys } from '@/data';
import { onForbidden } from '@/data/access';
import { isAccessError } from '@/data/errors';
import { useAccessContext } from '../hooks/use-access';
import { watchAccess } from '../utils/watch-access';
import { ShellSkeleton } from './shell-skeleton';

/**
 * Renders its children only once the user's access is known. A failed request shows
 * an error with Retry: permissions and modules are never assumed. Mount it once,
 * inside `RequireSession`.
 */
export function RequireAccess({ children }: { children: ReactNode }) {
  const { context, error, refetch } = useAccessContext();
  useReloadOnForbidden();
  useWatchAccess();

  // A refresh that fails keeps the last known access; a refusal does not.
  if (!context || isAccessError(error)) {
    if (!error) return <ShellSkeleton />;
    return (
      <div className="flex h-screen">
        <ErrorState title="Your access could not be loaded" error={error} onRetry={refetch} />
      </div>
    );
  }
  return <>{children}</>;
}

/** A 403 means the server's view of this user changed: ask for the access context again. */
function useReloadOnForbidden() {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      onForbidden(() => {
        void queryClient.invalidateQueries(
          { queryKey: queryKeys.access.all },
          { cancelRefetch: false },
        );
      }),
    [queryClient],
  );
}

/** When a module closes for this user, its cached rows go with it. */
function useWatchAccess() {
  const queryClient = useQueryClient();
  useEffect(() => watchAccess(queryClient), [queryClient]);
}
