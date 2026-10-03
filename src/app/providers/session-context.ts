import { createContext } from 'react';
import type { SignInInput } from '@/data/session';
import type { User } from '@/types/domain';

/** `error`: a saved session exists but could not be checked (network or server failure). */
export type SessionStatus = 'loading' | 'signed_out' | 'signed_in' | 'error';

export interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  /** Rotates cached reads after every identity transition, including the same user signing in again. */
  cacheVersion: number;
  /** Every write keeps the signal of the identity that started it. */
  dataSignal: AbortSignal;
  /** Which adapter is active; the sign-in form shows a member picker for `demo`. */
  adapterKind: 'demo' | 'api';
  signIn: (input: SignInInput) => Promise<User>;
  signOut: () => Promise<void>;
  /** Tries to restore the saved session again after `error`. */
  retry: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
