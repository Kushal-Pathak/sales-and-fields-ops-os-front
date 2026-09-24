import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { CreateInput, Stage, UpdateInput } from '@/types/domain';
import type { StageOrder } from '../utils/stage-order';

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function useCreateStage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<Stage>) => db.stages.create(input),
    onSuccess: () => invalidate(queryKeys.stages.all),
  });
}

export function useUpdateStage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Stage> }) =>
      db.stages.update(id, patch),
    onSuccess: () => invalidate(queryKeys.stages.all),
  });
}

/** Writes new `order` values; the list is updated optimistically so a drop settles at once. */
export function useReorderStages() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (changes: StageOrder[]) =>
      Promise.all(changes.map(({ id, order }) => db.stages.update(id, { order }))),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.stages.list() });
      const previous = queryClient.getQueryData<Stage[]>(queryKeys.stages.list());
      const orders = new Map(changes.map((change) => [change.id, change.order]));
      queryClient.setQueryData<Stage[]>(queryKeys.stages.list(), (rows) =>
        rows?.map((row) => (orders.has(row.id) ? { ...row, order: orders.get(row.id)! } : row)),
      );
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.stages.list(), context.previous);
    },
    onSettled: () => invalidate(queryKeys.stages.all),
  });
}

export interface DeleteStageInput {
  stageId: string;
  /** Where the stage's leads go. Required when the stage has leads. */
  moveToStageId: string | null;
}

/** Moves the stage's leads (logging the change) and then removes the stage. */
export function useDeleteStage() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ stageId, moveToStageId }: DeleteStageInput) => {
      const leads = (await db.leads.list()).filter((lead) => lead.stageId === stageId);
      if (leads.length > 0) {
        if (!moveToStageId) throw new Error('Choose a stage for the leads first.');
        const target = await db.stages.get(moveToStageId);
        const now = new Date().toISOString();
        for (const lead of leads) {
          await db.leads.update(lead.id, { stageId: target.id, lastActivityAt: now });
          await db.activities.create({
            entityType: 'lead',
            entityId: lead.id,
            kind: 'stage_changed',
            message: `Stage moved to ${target.name} (stage removed)`,
            actorId,
          });
        }
      }
      await db.stages.remove(stageId);
      return leads.length;
    },
    onSuccess: () =>
      invalidate(queryKeys.stages.all, queryKeys.leads.all, queryKeys.activities.all),
  });
}
