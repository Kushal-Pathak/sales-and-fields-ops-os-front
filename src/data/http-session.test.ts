import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, onUnauthorized, setAuthToken } from '@/lib/api';
import { deferred } from '@/test/deferred';
import { buildSeed } from './seed';
import { apiSession } from './session';

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

describe('HTTP session request ordering', () => {
  it('ignores an old token’s late 401, including when the same token is later reused', async () => {
    const pending = deferred<Response>();
    const unauthorized = vi.fn();
    const unsubscribe = onUnauthorized(unauthorized);
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockReturnValue(pending.promise));
    setAuthToken('old-token');
    const request = api.get('/tasks').catch((error: unknown) => error);
    setAuthToken(null);
    setAuthToken('old-token');
    pending.resolve(response(401));
    expect(await request).toBeInstanceOf(ApiError);
    expect(unauthorized).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('still reports an unauthorized request in the current session', async () => {
    const unauthorized = vi.fn();
    const unsubscribe = onUnauthorized(unauthorized);
    vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(401)));
    setAuthToken('current-token');
    await expect(api.get('/tasks')).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('does not send an old bearer token or sign out on a rejected login', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(response(401));
    const unauthorized = vi.fn();
    const unsubscribe = onUnauthorized(unauthorized);
    vi.stubGlobal('fetch', fetch);
    setAuthToken('existing-token');
    await expect(
      apiSession.signIn({ kind: 'api', email: 'test@example.com', password: 'invalid' }),
    ).rejects.toThrow('do not match');
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get('Authorization')).toBeNull();
    expect(unauthorized).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('a pending logout cannot clear a later successful login', async () => {
    const pendingLogout = deferred<Response>();
    const user = buildSeed().users[0];
    if (!user) throw new Error('seed missing');
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockReturnValueOnce(pendingLogout.promise)
      .mockResolvedValueOnce(response(200, { token: 'new-token', user }))
      .mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetch);
    setAuthToken('old-token');
    const loggingOut = apiSession.signOut();
    await apiSession.signIn({ kind: 'api', email: user.email, password: 'demo' });
    pendingLogout.resolve(response(401));
    await loggingOut;
    await api.get('/tasks');
    expect(new Headers(fetch.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer new-token',
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('keeps the saved token when restore fails for a reason other than a refusal', async () => {
    const user = buildSeed().users[0];
    if (!user) throw new Error('seed missing');
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(response(200, { token: 'saved-token', user }))
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200, user))
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(200));
    vi.stubGlobal('fetch', fetch);
    await apiSession.signIn({ kind: 'api', email: user.email, password: 'demo' });

    await expect(apiSession.restore()).rejects.toBeInstanceOf(ApiError);
    await expect(apiSession.restore()).resolves.toMatchObject({ id: user.id });
    expect(new Headers(fetch.mock.calls[2]?.[1]?.headers).get('Authorization')).toBe(
      'Bearer saved-token',
    );

    // A refusal does end the session: the token is gone, so nothing is sent next time.
    await expect(apiSession.restore()).resolves.toBeNull();
    await expect(apiSession.restore()).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(4);
  });
});
