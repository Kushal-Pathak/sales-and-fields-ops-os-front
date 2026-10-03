import { beginOptimisticListUpdate } from '@/data/optimistic-list';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type Db } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { CreateInput, Task, TaskStatus, UpdateInput } from '@/types/domain';

/**
 * Task mutations. Creating and completing a task also writes an `Activity` on its
 * lead, because the client owns timelines until a backend exists.
 */

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

async function touchLead(db: Db, leadId: string | undefined, at: string): Promise<void> {
  if (leadId) await db.leads.update(leadId, { lastActivityAt: at });
}

export function useCreateTask() {
  const write = useWriteOperation('tasks');
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async (input: CreateInput<Task>): Promise<Task> =>
      write(async (db) => {
        const created = await db.tasks.create(input);
        if (created.leadId) {
          await db.activities.create({
            entityType: 'lead',
            entityId: created.leadId,
            kind: 'task_created',
            message: `Task created: ${created.title}`,
            actorId,
          });
          await touchLead(db, created.leadId, created.createdAt);
        }
        return created;
      }),
    onSettled: () => invalidate(queryKeys.tasks.all, queryKeys.activities.all, queryKeys.leads.all),
  });
}

export function useUpdateTask() {
  const write = useWriteOperation('tasks');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Task> }) =>
      write(async (db) => db.tasks.update(id, patch)),
    onSuccess: (task) => {
      if (write.signal.aborted) return;
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
    },
    onSettled: () => invalidate(queryKeys.tasks.all),
  });
}

/** Status changes from the checkbox, the board and the drawer. Optimistic on the list. */
export function useSetTaskStatus() {
  const write = useWriteOperation('tasks');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }): Promise<Task> =>
      write(async (db) => {
        const now = new Date().toISOString();
        const patch: UpdateInput<Task> =
          status === 'completed'
            ? { status, completedAt: now }
            : { status, completedAt: undefined };
        const before = await db.tasks.get(id);
        const task = await db.tasks.update(id, patch);
        if (status === 'completed' && before.status !== 'completed' && task.leadId) {
          await db.activities.create({
            entityType: 'lead',
            entityId: task.leadId,
            kind: 'task_completed',
            message: `Task completed: ${task.title}`,
            actorId,
          });
          await touchLead(db, task.leadId, now);
        }
        return task;
      }),
    onMutate: async ({ id, status }) => {
      return beginOptimisticListUpdate<Task>(
        queryClient,
        queryKeys.tasks.list(),
        (rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)),
        write.signal,
      );
    },
    onError: (_error, _input, context) => {
      context?.rollback();
    },
    onSettled: async (task, _error, _input, context) => {
      try {
        if (task && !write.signal.aborted)
          queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
        return await invalidate(queryKeys.tasks.all, queryKeys.activities.all, queryKeys.leads.all);
      } finally {
        context?.release();
      }
    },
  });
}

export function useDeleteTask() {
  const write = useWriteOperation('tasks');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => write(async (db) => db.tasks.remove(id)),
    onSettled: () => invalidate(queryKeys.tasks.all),
  });
}
