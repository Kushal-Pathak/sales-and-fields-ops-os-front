import { AppShell } from '@/components/layout/app-shell';
import { RequireSession } from '@/features/auth';

/** The app shell behind the session guard; every route except `/sign-in` lives under it. */
export function GuardedShell() {
  return (
    <RequireSession>
      <AppShell />
    </RequireSession>
  );
}
