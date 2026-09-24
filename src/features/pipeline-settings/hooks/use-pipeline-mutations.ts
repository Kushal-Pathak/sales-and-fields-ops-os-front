import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Pipeline, UpdateInput } from '@/types/domain';

export function useUpdatePipeline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Pipeline> }) =>
      db.pipelines.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.pipelines.all }),
  });
}
