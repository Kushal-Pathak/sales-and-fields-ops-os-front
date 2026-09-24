import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { CreateInput, FieldDefinition, UpdateInput } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
}

export function useCreateField() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<FieldDefinition>) => db.fields.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateField() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<FieldDefinition> }) =>
      db.fields.update(id, patch),
    onSuccess: invalidate,
  });
}

export interface FieldOrder {
  id: string;
  order: number;
}

/** Writes new `order` values; the list is updated optimistically so a drop settles at once. */
export function useReorderFields() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (changes: FieldOrder[]) =>
      Promise.all(changes.map(({ id, order }) => db.fields.update(id, { order }))),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.fields.list() });
      const previous = queryClient.getQueryData<FieldDefinition[]>(queryKeys.fields.list());
      const orders = new Map(changes.map((change) => [change.id, change.order]));
      queryClient.setQueryData<FieldDefinition[]>(queryKeys.fields.list(), (rows) =>
        rows?.map((row) => (orders.has(row.id) ? { ...row, order: orders.get(row.id)! } : row)),
      );
      return { previous };
    },
    onError: (_error, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.fields.list(), context.previous);
    },
    onSettled: invalidate,
  });
}

/** Removes the definition only; values already stored on records are left in place. */
export function useDeleteField() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => db.fields.remove(id),
    onSuccess: invalidate,
  });
}
