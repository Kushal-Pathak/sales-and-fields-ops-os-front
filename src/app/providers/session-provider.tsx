import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { session, type SessionAdapter, type SignInInput } from '@/data/session';
import { onUnauthorized } from '@/data/session';
import { beginDataSession, getDataSessionSignal } from '@/data/session-scope';
import { SessionChangedError } from '@/data/errors';
import type { User } from '@/types/domain';
import { SessionContext, type SessionStatus } from './session-context';

interface SessionProviderProps {
  children: ReactNode;
  /** Tests pass a stub adapter; the app uses the one chosen by the data layer. */
  adapter?: SessionAdapter;
}

/**
 * Restores the session and exposes sign-in / sign-out. Each session gets its own
 * QueryClient (QueryProvider consumes cacheVersion).
 * Read it with `useAuth()` from `@/hooks/use-auth`.
 */
export function SessionProvider({ children, adapter = session }: SessionProviderProps) {
  const operation = useRef(0);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [cacheVersion, setCacheVersion] = useState(0);
  const [dataSignal, setDataSignal] = useState(getDataSessionSignal);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const current = ++operation.current;
    const signal = beginDataSession();
    adapter
      .restore({ signal })
      .then((restored) => {
        if (current !== operation.current) return;
        setDataSignal(signal);
        setUser(restored);
        setCacheVersion((version) => version + 1);
        setStatus(restored ? 'signed_in' : 'signed_out');
      })
      .catch(() => {
        if (current !== operation.current) return;
        // Not knowing is not the same as signed out: keep the saved session and offer Retry.
        setDataSignal(signal);
        setCacheVersion((version) => version + 1);
        setUser(null);
        setStatus('error');
      });
    return () => {
      operation.current += 1;
      beginDataSession();
    };
  }, [adapter, attempt]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((count) => count + 1);
  }, []);

  const signOut = useCallback(async () => {
    operation.current += 1;
    const signal = beginDataSession();
    setDataSignal(signal);
    setUser(null);
    setStatus('signed_out');
    setCacheVersion((version) => version + 1);
    await adapter.signOut({ signal });
  }, [adapter]);

  useEffect(() => onUnauthorized(() => void signOut()), [signOut]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      const current = ++operation.current;
      const signal = beginDataSession();
      setDataSignal(signal);
      const next = await adapter.signIn(input, { signal });
      if (current !== operation.current) throw new SessionChangedError();
      setUser(next);
      setStatus('signed_in');
      setCacheVersion((version) => version + 1);
      return next;
    },
    [adapter],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      cacheVersion,
      dataSignal,
      adapterKind: adapter.kind,
      signIn,
      signOut,
      retry,
    }),
    [status, user, cacheVersion, dataSignal, adapter.kind, signIn, signOut, retry],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
