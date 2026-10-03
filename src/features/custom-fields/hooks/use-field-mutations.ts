import { beginOptimisticListUpdate } from '@/data/optimistic-list';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import type { CreateInput, FieldDefinition, UpdateInput } from '@/types/domain';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.fields.all });
}

export function useCreateField() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateInput<FieldDefinition>) =>
      write(async (db) => db.fields.create(input)),
    onSettled: invalidate,
  });
}

export function useUpdateField() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<FieldDefinition> }) =>
      write(async (db) => db.fields.update(id, patch)),
    onSettled: invalidate,
  });
}

export interface FieldOrder {
  id: string;
  order: number;
}

/** Writes new `order` values; the list is updated optimistically so a drop settles at once. */
export function useReorderFields() {
  const write = useWriteOperation('settings');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (changes: FieldOrder[]) =>
      write(async (db) =>
        Promise.all(changes.map(({ id, order }) => db.fields.update(id, { order }))),
      ),
    onMutate: async (changes) => {
      const orders = new Map(changes.map((change) => [change.id, change.order]));
      return beginOptimisticListUpdate<FieldDefinition>(
        queryClient,
        queryKeys.fields.list(),
        (rows) =>
          rows.map((row) => (orders.has(row.id) ? { ...row, order: orders.get(row.id)! } : row)),
        write.signal,
      );
    },
    onError: (_error, _changes, context) => {
      context?.rollback();
    },
    onSettled: async (_data, _error, _input, context) => {
      try {
        return await invalidate();
      } finally {
        context?.release();
      }
    },
  });
}

/** Removes the definition only; values already stored on records are left in place. */
export function useDeleteField() {
  const write = useWriteOperation('settings');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => write(async (db) => db.fields.remove(id)),
    onSettled: invalidate,
  });
}
