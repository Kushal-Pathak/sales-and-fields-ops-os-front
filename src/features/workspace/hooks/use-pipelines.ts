import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Stage } from '@/types/domain';

export function usePipelines() {
  return useQuery({
    queryKey: queryKeys.pipelines.list(),
    queryFn: ({ signal }) => db.pipelines.list({ signal }),
  });
}

/** Stages sorted by `order`; pass a pipeline id to restrict to one pipeline. */
export function useStages(pipelineId?: string) {
  return useQuery({
    queryKey: queryKeys.stages.list(),
    queryFn: ({ signal }) => db.stages.list({ signal }),
    select: (rows: Stage[]) =>
      rows
        .filter((stage) => !pipelineId || stage.pipelineId === pipelineId)
        .sort((a, b) => a.order - b.order),
  });
}
