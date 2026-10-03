import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/data';
import { AccessRevokedError } from '@/data/errors';
import { getModuleWriteSignal } from '@/data/module-write-scope';
import { ApiError } from '@/lib/api';
import { fullAccess, seedAccess } from '@/test/access';
import { watchAccess } from './watch-access';

describe('access cache reconciliation', () => {
  it.each([401, 403])(
    'keeps cached access closed after a %s when the guard remounts',
    async (status) => {
      const client = new QueryClient();
      seedAccess(client, 'usr-1');
      client.setQueryData(queryKeys.tasks.list(), [{ id: 'private-task' }]);
      await expect(
        client.fetchQuery({
          queryKey: queryKeys.access.context('usr-1'),
          queryFn: () => Promise.reject(new ApiError(status, {})),
          retry: false,
        }),
      ).rejects.toBeInstanceOf(ApiError);
      const stop = watchAccess(client);
      expect(getModuleWriteSignal(client, 'tasks').reason).toBeInstanceOf(AccessRevokedError);
      expect(client.getQueryData(queryKeys.tasks.list())).toBeUndefined();
      stop();
      client.clear();
    },
  );

  it('removes already cached rows for initially denied modules', () => {
    const client = new QueryClient();
    seedAccess(client, 'usr-1', fullAccess({ permissions: [] }));
    client.setQueryData(queryKeys.tasks.list(), [{ id: 'private-task' }]);
    const stop = watchAccess(client);
    expect(client.getQueryData(queryKeys.tasks.list())).toBeUndefined();
    expect(getModuleWriteSignal(client, 'tasks').reason).toBeInstanceOf(AccessRevokedError);
    expect(getModuleWriteSignal(client, 'leads').aborted).toBe(false);
    stop();
    client.clear();
  });

  it('revokes synchronously, even with an unchanged revision, and gives reopened modules a fresh scope', () => {
    const client = new QueryClient();
    seedAccess(client, 'usr-1');
    const stop = watchAccess(client);
    const oldSignal = getModuleWriteSignal(client, 'tasks');
    client.setQueryData(queryKeys.tasks.detail('private-task'), { id: 'private-task' });
    const allowed = fullAccess();
    seedAccess(client, 'usr-1', {
      ...allowed,
      modules: allowed.modules.filter((id) => id !== 'tasks'),
    });
    expect(oldSignal.aborted).toBe(true);
    expect(client.getQueryData(queryKeys.tasks.detail('private-task'))).toBeUndefined();
    seedAccess(client, 'usr-1', allowed);
    expect(oldSignal.aborted).toBe(true);
    expect(getModuleWriteSignal(client, 'tasks').aborted).toBe(false);
    expect(getModuleWriteSignal(client, 'tasks')).not.toBe(oldSignal);
    stop();
    client.clear();
  });
});
