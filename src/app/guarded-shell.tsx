import { AppShell } from '@/components/layout/app-shell';
import { RequireAccess, RequireSession } from '@/features/auth';

/**
 * The app shell behind the session and access guards; every route except `/sign-in`
 * lives under it. Nothing inside renders until the user's access is known.
 */
export function GuardedShell() {
  return (
    <RequireSession>
      <RequireAccess>
        <AppShell />
      </RequireAccess>
    </RequireSession>
  );
}
