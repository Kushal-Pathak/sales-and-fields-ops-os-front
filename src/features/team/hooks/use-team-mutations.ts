import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { CreateInput, Role, UpdateInput, User } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/** Adds a member directly. With auth this becomes an invitation. */
export function useCreateMember() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<User>) => db.users.create(input),
    onSuccess: () => invalidate(queryKeys.users.all),
  });
}

export function useUpdateMember() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<User> }) =>
      db.users.update(id, patch),
    onSuccess: () => invalidate(queryKeys.users.all),
  });
}

export interface DeactivateInput {
  id: string;
  /** Who takes over the member's open leads and tasks. Required when there are any. */
  reassignToId: string | null;
}

/** Moves open leads and tasks to another member (logging it on each lead), then deactivates. */
export function useDeactivateMember() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ id, reassignToId }: DeactivateInput) => {
      const [leads, tasks, stages] = await Promise.all([
        db.leads.list(),
        db.tasks.list(),
        db.stages.list(),
      ]);
      const openStages = new Set(stages.filter((s) => s.kind === 'open').map((s) => s.id));
      const openLeads = leads.filter((l) => l.ownerId === id && openStages.has(l.stageId));
      const openTasks = tasks.filter(
        (t) => t.assigneeId === id && (t.status === 'pending' || t.status === 'in_progress'),
      );
      if ((openLeads.length > 0 || openTasks.length > 0) && !reassignToId)
        throw new Error('Choose who takes over first.');
      if (reassignToId) {
        const [from, to] = await Promise.all([db.users.get(id), db.users.get(reassignToId)]);
        const now = new Date().toISOString();
        for (const lead of openLeads) {
          await db.leads.update(lead.id, { ownerId: to.id, lastActivityAt: now });
          await db.activities.create({
            entityType: 'lead',
            entityId: lead.id,
            kind: 'reassigned',
            message: `Reassigned from ${from.name} to ${to.name}`,
            actorId,
          });
        }
        for (const task of openTasks) await db.tasks.update(task.id, { assigneeId: to.id });
      }
      await db.users.update(id, { active: false });
      return { leads: openLeads.length, tasks: openTasks.length };
    },
    onSuccess: () =>
      invalidate(
        queryKeys.users.all,
        queryKeys.leads.all,
        queryKeys.tasks.all,
        queryKeys.activities.all,
      ),
  });
}

export function useCreateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<Role>) => db.roles.create(input),
    onSuccess: () => invalidate(queryKeys.roles.all),
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Role> }) =>
      db.roles.update(id, patch),
    onSuccess: () => invalidate(queryKeys.roles.all),
  });
}

/** Refuses when any member still has the role. */
export function useDeleteRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const users = await db.users.list();
      if (users.some((user) => user.roleId === id))
        throw new Error('Move its members to another role first.');
      await db.roles.remove(id);
    },
    onSuccess: () => invalidate(queryKeys.roles.all),
  });
}
