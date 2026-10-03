import { beginOptimisticListUpdate } from '@/data/optimistic-list';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import type { Automation, CreateInput, UpdateInput } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useCreateAutomation() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<Automation>) =>
      write(async (db) => db.automations.create(input)),
    onSettled: () => invalidate(queryKeys.automations.all),
  });
}

export function useUpdateAutomation() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Automation> }) =>
      write(async (db) => db.automations.update(id, patch)),
    onSettled: () => invalidate(queryKeys.automations.all),
  });
}

/** The On switch in the table; optimistic so it flips at once. */
export function useToggleAutomation() {
  const write = useWriteOperation('settings');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      write(async (db) => db.automations.update(id, { active })),
    onMutate: async ({ id, active }) => {
      return beginOptimisticListUpdate<Automation>(
        queryClient,
        queryKeys.automations.list(),
        (rows) => rows.map((row) => (row.id === id ? { ...row, active } : row)),
        write.signal,
      );
    },
    onError: (_error, _input, context) => {
      context?.rollback();
    },
    onSettled: async (_data, _error, _input, context) => {
      try {
        return await invalidate(queryKeys.automations.all);
      } finally {
        context?.release();
      }
    },
  });
}

/** Removes the rule and its run history. */
export function useDeleteAutomation() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) =>
      write(async (db) => {
        const runs = (await db.automationRuns.list()).filter((run) => run.automationId === id);
        await Promise.all(runs.map((run) => db.automationRuns.remove(run.id)));
        await db.automations.remove(id);
      }),
    onSettled: () => invalidate(queryKeys.automations.all, queryKeys.automationRuns.all),
  });
}
