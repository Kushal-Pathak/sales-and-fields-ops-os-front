import { api, ApiError, onUnauthorized, setAuthToken } from '@/lib/api';
import type { User } from '@/types/domain';
import { db, isDemoData } from './index';
import { readValue, writeValue } from './local-store';

/**
 * The signed-in session. Two adapters behind one interface: the demo one picks a
 * seeded member and remembers the choice per browser; the API one signs in
 * against the backend, which owns credentials and enforcement. Nothing here is
 * security on its own — the backend decides what a user may read or change.
 */

export type SignInInput =
  { kind: 'demo'; userId: string } | { kind: 'api'; email: string; password: string };

export interface SessionAdapter {
  kind: 'demo' | 'api';
  /** The user of a previously saved session, or `null`. */
  restore(): Promise<User | null>;
  signIn(input: SignInInput): Promise<User>;
  signOut(): Promise<void>;
}

const SESSION_KEY = 'session';
const TOKEN_KEY = 'auth-token';

export class SignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignInError';
  }
}

async function findUser(userId: string): Promise<User | null> {
  try {
    return await db.users.get(userId);
  } catch {
    return null;
  }
}

/** Picks a seeded member; used whenever the app runs on local demo data. */
export const demoSession: SessionAdapter = {
  kind: 'demo',
  async restore() {
    const stored = readValue<{ userId?: string }>(SESSION_KEY);
    if (!stored?.userId) return null;
    const user = await findUser(stored.userId);
    if (!user || !user.active) {
      writeValue(SESSION_KEY, null);
      return null;
    }
    return user;
  },
  async signIn(input) {
    if (input.kind !== 'demo') throw new SignInError('The demo signs in by choosing a member.');
    const user = await findUser(input.userId);
    if (!user) throw new SignInError('That member no longer exists.');
    if (!user.active) throw new SignInError('That member is deactivated.');
    writeValue(SESSION_KEY, { userId: user.id });
    return user;
  },
  async signOut() {
    writeValue(SESSION_KEY, null);
  },
};

interface LoginResponse {
  token: string;
  user: User;
}

/**
 * Signs in against the backend. The token is kept in memory for requests and
 * persisted per browser so a reload keeps the session; move it to an httpOnly
 * cookie once the backend supports that.
 */
export const apiSession: SessionAdapter = {
  kind: 'api',
  async restore() {
    const token = readValue<string>(TOKEN_KEY);
    if (!token) return null;
    setAuthToken(token);
    try {
      return await api.get<User>('/auth/me');
    } catch {
      setAuthToken(null);
      writeValue(TOKEN_KEY, null);
      return null;
    }
  },
  async signIn(input) {
    if (input.kind !== 'api') throw new SignInError('Email and password are required.');
    let response: LoginResponse;
    try {
      response = await api.post<LoginResponse>('/auth/login', {
        body: { email: input.email, password: input.password },
      });
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        throw new SignInError('That email and password do not match.');
      }
      throw cause;
    }
    const { token, user } = response;
    setAuthToken(token);
    writeValue(TOKEN_KEY, token);
    return user;
  },
  async signOut() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best effort: the local session is cleared either way.
    }
    setAuthToken(null);
    writeValue(TOKEN_KEY, null);
  },
};

export const session: SessionAdapter = isDemoData ? demoSession : apiSession;

/** Registers the handler the API client calls when a request comes back 401. */
export { onUnauthorized };
