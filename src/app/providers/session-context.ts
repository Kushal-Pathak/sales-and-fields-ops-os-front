import { createContext } from 'react';
import type { SignInInput } from '@/data/session';
import type { User } from '@/types/domain';

export type SessionStatus = 'loading' | 'signed_out' | 'signed_in';

export interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  /** Which adapter is active; the sign-in form shows a member picker for `demo`. */
  adapterKind: 'demo' | 'api';
  signIn: (input: SignInInput) => Promise<User>;
  signOut: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);
