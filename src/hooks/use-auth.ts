import { useContext } from 'react';
import { SessionContext, type SessionContextValue } from '@/app/providers/session-context';

/** The session: who is signed in, and sign-in / sign-out. */
export function useAuth(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error(
      'useAuth must be used within <SessionProvider> (see src/app/providers/index.tsx)',
    );
  }
  return context;
}
