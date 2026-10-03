import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, setAuthToken } from '@/lib/api';
import { AccessRevokedError } from './errors';
import { db } from './index';
import { deleteLead } from './lead-commands';
import { deactivateMember } from './member-commands';
import { setModuleEnabled } from './module-settings';
import { runWriteOperation } from './write-operation';

vi.mock('@/lib/env', () => ({ env: { apiBaseUrl: 'https://api.test' } }));

beforeEach(() => setAuthToken('test-token'));
afterEach(() => {
  setAuthToken(null);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function successfulRequest() {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('API commands across module boundaries', () => {
  it('patches only the requested module, leaving concurrency and entitlements to the API', async () => {
    const fetch = successfulRequest();
    const signal = new AbortController().signal;
    await setModuleEnabled({ id: 'quotes', enabled: false }, { signal });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://api.test/workspace/modules/quotes',
      expect.objectContaining({ method: 'PATCH', body: '{"enabled":false}', signal }),
    );
  });

  it('deletes a lead with one request without reading closed modules', async () => {
    const fetch = successfulRequest();
    const tasks = vi.spyOn(db.tasks, 'list').mockRejectedValue(new ApiError(403, {}));
    const quotes = vi.spyOn(db.quotes, 'list').mockRejectedValue(new ApiError(403, {}));
    const appointments = vi.spyOn(db.appointments, 'list').mockRejectedValue(new ApiError(403, {}));
    const signal = new AbortController().signal;
    await runWriteOperation(signal, (database) => deleteLead(database, 'lead/1'));
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://api.test/leads/lead%2F1',
      expect.objectContaining({ method: 'DELETE', signal }),
    );
    expect(tasks).not.toHaveBeenCalled();
    expect(quotes).not.toHaveBeenCalled();
    expect(appointments).not.toHaveBeenCalled();
  });

  it('delegates member reassignment without reading hidden tasks or sending the actor', async () => {
    const fetch = successfulRequest();
    const tasks = vi.spyOn(db.tasks, 'list').mockRejectedValue(new ApiError(403, {}));
    const signal = new AbortController().signal;
    const result = await deactivateMember(
      db,
      { id: 'usr/3', reassignToId: 'usr-1' },
      'spoofed-actor',
      { signal },
    );
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'https://api.test/users/usr%2F3/deactivate',
      expect.objectContaining({ method: 'POST', body: '{"reassignToId":"usr-1"}', signal }),
    );
    expect(tasks).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('propagates a server refusal without falling back to collection writes', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(new Response(null, { status: 403 }));
    vi.stubGlobal('fetch', fetch);
    await expect(setModuleEnabled({ id: 'quotes', enabled: false })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetch).toHaveBeenCalledOnce();
  });

  it.each(['module', 'lead', 'member'])('does not start an aborted %s command', async (kind) => {
    const fetch = successfulRequest();
    const scope = new AbortController();
    scope.abort(new AccessRevokedError());
    const operation =
      kind === 'module'
        ? setModuleEnabled({ id: 'quotes', enabled: false }, { signal: scope.signal })
        : kind === 'lead'
          ? runWriteOperation(scope.signal, (database) => deleteLead(database, 'lead-1'))
          : deactivateMember(db, { id: 'usr-3', reassignToId: 'usr-1' }, null, {
              signal: scope.signal,
            });
    await expect(operation).rejects.toBeInstanceOf(AccessRevokedError);
    expect(fetch).not.toHaveBeenCalled();
  });
});
