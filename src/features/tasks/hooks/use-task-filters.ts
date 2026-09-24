import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  hasActiveTaskFilters,
  parseTaskFilters,
  serializeTaskFilters,
  type TaskFilters,
} from '../utils/task-filters';

/** The tasks list state, kept in the query string. */
export function useTaskFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseTaskFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<TaskFilters>) => {
      setSearchParams(
        (prev) => serializeTaskFilters({ ...parseTaskFilters(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(
    () => update({ q: '', type: null, assigneeId: null, priority: null }),
    [update],
  );

  return { filters, update, clear, isActive: hasActiveTaskFilters(filters) };
}
