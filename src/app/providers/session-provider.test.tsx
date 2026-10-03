import { StrictMode, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { SessionChangedError } from '@/data/errors';
import { buildSeed } from '@/data/seed';
import type { SessionAdapter } from '@/data/session';
import { useUpdateTask } from '@/features/tasks/hooks/use-task-mutations';
import { useAuth } from '@/hooks/use-auth';
import { deferred } from '@/test/deferred';
import { stubSession } from '@/test/stub-session';
import type { Task, User } from '@/types/domain';
import { QueryProvider } from './query-provider';
import { SessionProvider } from './session-provider';

function wrap(adapter: SessionAdapter, strict = false) {
  return ({ children }: { children: ReactNode }) => {
    const tree = (
      <SessionProvider adapter={adapter}>
        <QueryProvider>{children}</QueryProvider>
      </SessionProvider>
    );
    return strict ? <StrictMode>{tree}</StrictMode> : tree;
  };
}

beforeEach(() => resetDemoData());
afterEach(() => vi.restoreAllMocks());

describe('session transitions', () => {
  it('old writes cannot repopulate the new user’s cache', async () => {
    const seed = buildSeed();
    const task = seed.tasks[0];
    if (!task) throw new Error('seed missing');
    const pending = deferred<Task>();
    const update = vi.spyOn(db.tasks, 'update').mockReturnValueOnce(pending.promise);
    const { result } = renderHook(
      () => ({ auth: useAuth(), client: useQueryClient(), update: useUpdateTask() }),
      { wrapper: wrap(stubSession('usr-1')) },
    );
    await waitFor(() => expect(result.current.auth.status).toBe('signed_in'));
    const oldClient = result.current.client;
    const saving = result.current.update
      .mutateAsync({ id: task.id, patch: { title: 'Old session' } })
      .catch((error: unknown) => error);
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    await act(async () => {
      await result.current.auth.signOut();
    });
    await act(async () => {
      await result.current.auth.signIn({ kind: 'demo', userId: 'usr-3' });
    });
    expect(result.current.auth.user?.id).toBe('usr-3');
    expect(result.current.client).not.toBe(oldClient);
    await act(async () => {
      pending.resolve({ ...task, title: 'Old session' });
    });
    expect(await saving).toBeInstanceOf(SessionChangedError);
    expect(result.current.client.getQueryData(queryKeys.tasks.detail(task.id))).toBeUndefined();
    expect(oldClient.getQueryData(queryKeys.tasks.detail(task.id))).toBeUndefined();
  });

  it('a late restore cannot overwrite a newer sign-in', async () => {
    const seed = buildSeed();
    const restored = deferred<User | null>();
    const base = stubSession(null);
    const adapter: SessionAdapter = { ...base, restore: () => restored.promise };
    const { result } = renderHook(useAuth, { wrapper: wrap(adapter) });
    await act(async () => {
      await result.current.signIn({ kind: 'demo', userId: 'usr-3' });
    });
    await act(async () => {
      restored.resolve(seed.users[0] ?? null);
    });
    expect(result.current.user?.id).toBe('usr-3');
    expect(result.current.status).toBe('signed_in');
  });

  it('restores successfully in StrictMode and keeps a stable client within the session', async () => {
    const { result, rerender } = renderHook(() => ({ auth: useAuth(), client: useQueryClient() }), {
      wrapper: wrap(stubSession('usr-1'), true),
    });
    await waitFor(() => expect(result.current.auth.status).toBe('signed_in'));
    const client = result.current.client;
    rerender();
    expect(result.current.client).toBe(client);
    await act(async () => {
      await result.current.auth.signOut();
    });
    expect(result.current.client).not.toBe(client);
  });

  it('reports a restore that could not be checked as an error, not as signed out, and retries', async () => {
    const base = stubSession('usr-1');
    const restore = vi
      .fn<SessionAdapter['restore']>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockImplementation(() => base.restore());
    const { result } = renderHook(useAuth, { wrapper: wrap({ ...base, restore }) });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.user).toBeNull();
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('signed_in'));
    expect(result.current.user?.id).toBe('usr-1');
  });
});
