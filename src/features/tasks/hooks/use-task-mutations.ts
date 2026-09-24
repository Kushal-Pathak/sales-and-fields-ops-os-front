import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
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

async function touchLead(leadId: string | undefined, at: string): Promise<void> {
  if (leadId) await db.leads.update(leadId, { lastActivityAt: at });
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async (input: CreateInput<Task>): Promise<Task> => {
      const created = await db.tasks.create(input);
      if (created.leadId) {
        await db.activities.create({
          entityType: 'lead',
          entityId: created.leadId,
          kind: 'task_created',
          message: `Task created: ${created.title}`,
          actorId,
        });
        await touchLead(created.leadId, created.createdAt);
      }
      return created;
    },
    onSuccess: () => invalidate(queryKeys.tasks.all, queryKeys.activities.all, queryKeys.leads.all),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Task> }) =>
      db.tasks.update(id, patch),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      return invalidate(queryKeys.tasks.all);
    },
  });
}

/** Status changes from the checkbox, the board and the drawer. Optimistic on the list. */
export function useSetTaskStatus() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }): Promise<Task> => {
      const now = new Date().toISOString();
      const patch: UpdateInput<Task> =
        status === 'completed' ? { status, completedAt: now } : { status, completedAt: undefined };
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
        await touchLead(task.leadId, now);
      }
      return task;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.list() });
      const previous = queryClient.getQueryData<Task[]>(queryKeys.tasks.list());
      queryClient.setQueryData<Task[]>(queryKeys.tasks.list(), (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.tasks.list(), context.previous);
    },
    onSettled: (task) => {
      if (task) queryClient.setQueryData(queryKeys.tasks.detail(task.id), task);
      return invalidate(queryKeys.tasks.all, queryKeys.activities.all, queryKeys.leads.all);
    },
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => db.tasks.remove(id),
    onSuccess: () => invalidate(queryKeys.tasks.all),
  });
}
