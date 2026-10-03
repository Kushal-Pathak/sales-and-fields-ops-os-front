import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import type { Pipeline, UpdateInput } from '@/types/domain';

export function useUpdatePipeline() {
  const write = useWriteOperation('settings');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Pipeline> }) =>
      write(async (db) => db.pipelines.update(id, patch)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
  });
}
