import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Automation, CreateInput, UpdateInput } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useCreateAutomation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<Automation>) => db.automations.create(input),
    onSuccess: () => invalidate(queryKeys.automations.all),
  });
}

export function useUpdateAutomation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Automation> }) =>
      db.automations.update(id, patch),
    onSuccess: () => invalidate(queryKeys.automations.all),
  });
}

/** The On switch in the table; optimistic so it flips at once. */
export function useToggleAutomation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      db.automations.update(id, { active }),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.automations.list() });
      const previous = queryClient.getQueryData<Automation[]>(queryKeys.automations.list());
      queryClient.setQueryData<Automation[]>(queryKeys.automations.list(), (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, active } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.automations.list(), context.previous);
    },
    onSettled: () => invalidate(queryKeys.automations.all),
  });
}

/** Removes the rule and its run history. */
export function useDeleteAutomation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const runs = (await db.automationRuns.list()).filter((run) => run.automationId === id);
      await Promise.all(runs.map((run) => db.automationRuns.remove(run.id)));
      await db.automations.remove(id);
    },
    onSuccess: () => invalidate(queryKeys.automations.all, queryKeys.automationRuns.all),
  });
}
