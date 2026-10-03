import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { PartialWriteError } from '@/data/errors';
import { beginDataSession } from '@/data/session-scope';
import { buildSeed } from '@/data/seed';
import { deferred } from '@/test/deferred';
import type { Task } from '@/types/domain';
import { useCreateTask, useSetTaskStatus } from './use-task-mutations';

function setup() {
  beginDataSession();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(queryKeys.users.list(), buildSeed().users);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => resetDemoData());
afterEach(() => vi.restoreAllMocks());

describe('task mutation reconciliation', () => {
  it('refreshes affected reads after a task commits and its activity fails', async () => {
    const { client, wrapper } = setup();
    const seed = buildSeed();
    const existing = seed.tasks.find((task) => task.leadId);
    const leadId = existing?.leadId;
    if (!existing || !leadId) throw new Error('seed missing');
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    vi.spyOn(db.activities, 'create').mockRejectedValueOnce(new Error('audit unavailable'));
    const { result } = renderHook(useCreateTask, { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          title: 'Partial save',
          assigneeId: existing.assigneeId,
          leadId,
          dueAt: existing.dueAt,
          type: 'general',
          priority: 'medium',
          status: 'pending',
        }),
      ).rejects.toBeInstanceOf(PartialWriteError);
    });
    expect((await db.tasks.list()).some((task) => task.title === 'Partial save')).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.tasks.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.activities.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.leads.all });
    client.clear();
  });

  it('serializes two observers through rollback and refresh so A cannot erase B', async () => {
    const { client, wrapper } = setup();
    const tasks = buildSeed().tasks.filter((task) => task.status === 'pending');
    const [taskA, taskB] = tasks;
    if (!taskA || !taskB) throw new Error('seed missing');
    client.setQueryData(queryKeys.tasks.list(), tasks);
    const pendingA = deferred<Task>();
    const pendingB = deferred<Task>();
    const refresh = deferred<void>();
    const update = vi
      .spyOn(db.tasks, 'update')
      .mockImplementation((id) => (id === taskA.id ? pendingA.promise : pendingB.promise));
    vi.spyOn(client, 'invalidateQueries').mockReturnValueOnce(refresh.promise);
    const { result } = renderHook(() => ({ a: useSetTaskStatus(), b: useSetTaskStatus() }), {
      wrapper,
    });
    const savingA = result.current.a
      .mutateAsync({ id: taskA.id, status: 'in_progress' })
      .catch((error: unknown) => error);
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    const savingB = result.current.b.mutateAsync({ id: taskB.id, status: 'in_progress' });
    await act(async () => {
      await Promise.resolve();
      pendingA.reject(new Error('A failed'));
    });
    expect(update).toHaveBeenCalledTimes(1);
    await act(async () => {
      refresh.resolve();
      await savingA;
    });
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    const rows = client.getQueryData<Task[]>(queryKeys.tasks.list());
    expect(rows?.find((task) => task.id === taskA.id)?.status).toBe('pending');
    expect(rows?.find((task) => task.id === taskB.id)?.status).toBe('in_progress');
    await act(async () => {
      pendingB.resolve({ ...taskB, status: 'in_progress' });
      await savingB;
    });
    expect(client.getQueryData<Task>(queryKeys.tasks.detail(taskB.id))?.status).toBe('in_progress');
    client.clear();
  });
});
