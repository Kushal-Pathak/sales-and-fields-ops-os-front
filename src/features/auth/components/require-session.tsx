import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ErrorState } from '@/components/common/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { ShellSkeleton } from './shell-skeleton';

/**
 * Renders its children only with a signed-in session; otherwise sends the user to sign in.
 * A session that could not be checked (the network, not a refusal) offers Retry instead.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { status, retry } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <ShellSkeleton />;
  if (status === 'error') {
    return (
      <div className="flex h-screen">
        <ErrorState title="Your session could not be restored" onRetry={retry} />
      </div>
    );
  }
  if (status === 'signed_out') {
    return (
      <Navigate to="/sign-in" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return <>{children}</>;
}
