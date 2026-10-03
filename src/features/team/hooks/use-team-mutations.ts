import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import { deactivateMember, type DeactivateInput } from '@/data/member-commands';
import { useCurrentUser } from '@/features/workspace';
import type { CreateInput, Role, UpdateInput, User } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/** Adds a member directly. With auth this becomes an invitation. */
export function useCreateMember() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<User>) => write(async (db) => db.users.create(input)),
    onSettled: () => invalidate(queryKeys.users.all),
  });
}

/** A member's role decides their access, so the access context is refreshed with the member. */
export function useUpdateMember() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<User> }) =>
      write(async (db) => db.users.update(id, patch)),
    onSettled: () => invalidate(queryKeys.users.all, queryKeys.access.all),
  });
}

/** Moves open leads and tasks to another member (logging it on each lead), then deactivates. */
export function useDeactivateMember() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: (input: DeactivateInput) =>
      write((db, options) => deactivateMember(db, input, actorId, options)),
    onSettled: () =>
      invalidate(
        queryKeys.users.all,
        queryKeys.leads.all,
        queryKeys.tasks.all,
        queryKeys.activities.all,
        queryKeys.access.all,
      ),
  });
}

export function useCreateRole() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<Role>) => write(async (db) => db.roles.create(input)),
    onSettled: () => invalidate(queryKeys.roles.all),
  });
}

export function useUpdateRole() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Role> }) =>
      write(async (db) => db.roles.update(id, patch)),
    onSettled: () => invalidate(queryKeys.roles.all, queryKeys.access.all),
  });
}

/** Refuses when any member still has the role. */
export function useDeleteRole() {
  const write = useWriteOperation('team');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) =>
      write(async (db) => {
        const users = await db.users.list();
        if (users.some((user) => user.roleId === id))
          throw new Error('Move its members to another role first.');
        await db.roles.remove(id);
      }),
    onSettled: () => invalidate(queryKeys.roles.all, queryKeys.access.all),
  });
}
