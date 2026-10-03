import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Workspace } from '@/types/domain';

/** The single workspace row; `currency` / `locale` drive `formatMoney` and `formatDate`. */
export function useWorkspace() {
  return useQuery({
    queryKey: queryKeys.workspace.list(),
    queryFn: ({ signal }) => db.workspace.list({ signal }),
    select: (rows: Workspace[]) => rows[0],
  });
}
