import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { session, type SessionAdapter, type SignInInput } from '@/data/session';
import { onUnauthorized } from '@/data/session';
import type { User } from '@/types/domain';
import { SessionContext, type SessionStatus } from './session-context';

interface SessionProviderProps {
  children: ReactNode;
  /** Tests pass a stub adapter; the app uses the one chosen by the data layer. */
  adapter?: SessionAdapter;
}

/**
 * Restores the saved session on load and exposes sign-in / sign-out. Every query
 * is dropped when the user changes so nothing owned by the previous user lingers.
 * Read it with `useAuth()` from `@/hooks/use-auth`.
 */
export function SessionProvider({ children, adapter = session }: SessionProviderProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    adapter
      .restore()
      .then((restored) => {
        if (cancelled) return;
        setUser(restored);
        setStatus(restored ? 'signed_in' : 'signed_out');
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus('signed_out');
      });
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const signOut = useCallback(async () => {
    await adapter.signOut();
    setUser(null);
    setStatus('signed_out');
    queryClient.clear();
  }, [adapter, queryClient]);

  useEffect(() => onUnauthorized(() => void signOut()), [signOut]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const next = await adapter.signIn(input);
      queryClient.clear();
      setUser(next);
      setStatus('signed_in');
      return next;
    },
    [adapter, queryClient],
  );

  const value = useMemo(
    () => ({ status, user, adapterKind: adapter.kind, signIn, signOut }),
    [status, user, adapter.kind, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
