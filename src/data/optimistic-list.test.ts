import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { AccessRevokedError } from './errors';
import { beginOptimisticListUpdate, hasPendingListWrite } from './optimistic-list';

describe('optimistic rollback ownership', () => {
  it('preserves newer authoritative rows when rolling back a failed update', async () => {
    const client = new QueryClient();
    const key = ['tasks', 'list'];
    const rows = [
      { id: 'a', title: 'A', status: 'pending' },
      { id: 'b', title: 'B', status: 'pending' },
    ];
    client.setQueryData(key, rows);
    const change = await beginOptimisticListUpdate(client, key, (items: typeof rows) =>
      items.map((row) => (row.id === 'a' ? { ...row, status: 'completed' } : row)),
    );
    client.setQueryData(key, [
      { id: 'a', title: 'Updated by server', status: 'in_progress' },
      { id: 'b', title: 'New B', status: 'completed' },
    ]);
    change.rollback();
    expect(client.getQueryData(key)).toEqual([
      { id: 'a', title: 'Updated by server', status: 'in_progress' },
      { id: 'b', title: 'New B', status: 'completed' },
    ]);
    change.release();
    client.clear();
  });

  it('drops a queued optimistic change whose original access scope was revoked', async () => {
    const client = new QueryClient();
    const key = ['tasks', 'list'];
    const rows = [{ id: 'a', status: 'pending' }];
    client.setQueryData(key, rows);
    const first = await beginOptimisticListUpdate(client, key, () => rows);
    const scope = new AbortController();
    const second = beginOptimisticListUpdate(
      client,
      key,
      () => [{ id: 'a', status: 'completed' }],
      scope.signal,
    );
    const rejection = expect(second).rejects.toBeInstanceOf(AccessRevokedError);
    scope.abort(new AccessRevokedError());
    client.removeQueries({ queryKey: key });
    first.release();
    await rejection;
    expect(client.getQueryData(key)).toBeUndefined();
    expect(hasPendingListWrite(client, key)).toBe(false);
    client.clear();
  });
});
