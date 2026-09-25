import type { ReactNode } from 'react';
import { SessionProvider } from '@/app/providers/session-provider';
import { stubSession } from './stub-session';

/** Wraps children in a `SessionProvider` signed in as `userId` (or signed out for `null`). */
export function SignedInAs({ userId, children }: { userId: string | null; children: ReactNode }) {
  return <SessionProvider adapter={stubSession(userId)}>{children}</SessionProvider>;
}
