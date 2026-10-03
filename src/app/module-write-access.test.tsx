import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { AccessRevokedError } from '@/data/errors';
import { beginDataSession } from '@/data/session-scope';
import { fullAccess, seedAccess } from '@/test/access';
import { watchAccess } from '@/features/auth/utils/watch-access';
import type { ReactNode } from 'react';
import { RequireAccess } from '@/features/auth';
import { useSetTaskStatus, useUpdateTask } from '@/features/tasks/hooks/use-task-mutations';
import { deferred } from '@/test/deferred';
import { SignedInAs } from '@/test/session';
import type { Task } from '@/types/domain';

const seed = buildSeed();
function TaskEditor() {
  const update = useUpdateTask();
  return (
    <>
      <button onClick={() => update.mutate({ id: seed.tasks[0]!.id, patch: { title: 'Updated' } })}>
        Save task
      </button>
      {update.error && <p>{update.error.message}</p>}
    </>
  );
}

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SignedInAs userId="usr-1">
        <RequireAccess>
          <TaskEditor />
        </RequireAccess>
      </SignedInAs>
    </QueryClientProvider>,
  );
  return client;
}

function setup(
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } }),
) {
  beginDataSession();
  client.setQueryData(queryKeys.users.list(), seed.users);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => resetDemoData());
afterEach(() => vi.restoreAllMocks());

describe('module write access', () => {
  it('ignores a detail-cache callback if access changes after the command resolves', async () => {
    const allowed = fullAccess();
    const client: QueryClient = new QueryClient({
      mutationCache: new MutationCache({
        onSuccess: () =>
          seedAccess(client, 'usr-1', {
            ...allowed,
            modules: allowed.modules.filter((id) => id !== 'tasks'),
          }),
      }),
    });
    const { wrapper } = setup(client);
    seedAccess(client, 'usr-1', allowed);
    const stop = watchAccess(client);
    const task = seed.tasks[0]!;
    client.setQueryData(queryKeys.tasks.detail(task.id), task);
    const { result } = renderHook(useUpdateTask, { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: task.id, patch: { title: 'Updated' } });
    });
    expect((await db.tasks.get(task.id)).title).toBe('Updated');
    expect(client.getQueryData(queryKeys.tasks.detail(task.id))).toBeUndefined();
    stop();
    client.clear();
  });

  it('does not restore detail data from a save that finishes after access is revoked', async () => {
    const pending = deferred<Task>();
    const task = seed.tasks[0]!;
    const update = vi.spyOn(db.tasks, 'update').mockReturnValueOnce(pending.promise);
    const client = renderEditor();
    const user = userEvent.setup();
    const save = await screen.findByRole('button', { name: 'Save task' });
    client.setQueryData(queryKeys.tasks.detail(task.id), task);
    await user.click(save);
    expect(update).toHaveBeenCalledOnce();
    await act(async () => {
      const workspace = (await db.workspace.list())[0]!;
      await db.workspace.update(workspace.id, {
        modules: workspace.modules.map((module) =>
          module.id === 'tasks' ? { ...module, enabled: false } : module,
        ),
      });
      await client.invalidateQueries({ queryKey: queryKeys.access.all });
    });
    expect(client.getQueryData(queryKeys.tasks.detail(task.id))).toBeUndefined();
    await act(async () => pending.resolve({ ...task, title: 'Updated' }));
    expect(
      await screen.findByText('Access to this module changed. This operation was stopped.'),
    ).toBeInTheDocument();
    expect(client.getQueryData(queryKeys.tasks.detail(task.id))).toBeUndefined();
    client.clear();
  });
  it('cancels both running and queued writes across a close-and-reopen cycle', async () => {
    const { client, wrapper } = setup();
    const [taskA, taskB] = buildSeed().tasks;
    if (!taskA || !taskB) throw new Error('seed missing');
    const allowed = fullAccess();
    seedAccess(client, 'usr-1', allowed);
    const stop = watchAccess(client);
    client.setQueryData(queryKeys.tasks.list(), [taskA, taskB]);
    const pending = deferred<Task>();
    const update = vi.spyOn(db.tasks, 'update').mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => ({ a: useSetTaskStatus(), b: useSetTaskStatus() }), {
      wrapper,
    });
    const savingA = result.current.a
      .mutateAsync({ id: taskA.id, status: 'in_progress' })
      .catch((error: unknown) => error);
    await waitFor(() => expect(update).toHaveBeenCalledOnce());
    const savingB = result.current.b
      .mutateAsync({ id: taskB.id, status: 'in_progress' })
      .catch((error: unknown) => error);
    await waitFor(() => expect(result.current.b.isPending).toBe(true));
    await act(async () => {
      seedAccess(client, 'usr-1', {
        ...allowed,
        modules: allowed.modules.filter((id) => id !== 'tasks'),
      });
      seedAccess(client, 'usr-1', allowed);
    });
    await act(async () => {
      pending.resolve({ ...taskA, status: 'in_progress' });
      expect(await savingA).toBeInstanceOf(AccessRevokedError);
      expect(await savingB).toBeInstanceOf(AccessRevokedError);
    });
    expect(update).toHaveBeenCalledOnce();
    expect(client.getQueryData(queryKeys.tasks.detail(taskA.id))).toBeUndefined();
    expect(client.getQueryData(queryKeys.tasks.detail(taskB.id))).toBeUndefined();
    await waitFor(() => {
      expect(result.current.a.isError).toBe(true);
      expect(result.current.b.isError).toBe(true);
    });
    await act(async () => {
      await result.current.a.mutateAsync({ id: taskA.id, status: 'in_progress' });
    });
    expect(update).toHaveBeenCalledTimes(2);
    expect(client.getQueryData<Task>(queryKeys.tasks.detail(taskA.id))?.status).toBe('in_progress');
    stop();
    client.clear();
  });
});
