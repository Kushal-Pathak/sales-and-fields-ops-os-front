import { useMemo } from 'react';
import { useCurrentUser } from '@/features/workspace';
import { filterTasks, sortTasks, viewCounts } from '../utils/task-view-model';
import { useTaskFilters } from './use-task-filters';
import { useTasks } from './use-tasks';

/** The tasks page state: all rows, the visible rows, view counts and the URL filters. */
export function useTasksList() {
  const { filters, update, clear, isActive } = useTaskFilters();
  const { rows, isPending, error, refetch } = useTasks();
  const currentUserId = useCurrentUser().data?.id;

  const visible = useMemo(
    () => (rows ? sortTasks(filterTasks(rows, filters, currentUserId), filters.sort) : undefined),
    [rows, filters, currentUserId],
  );
  const counts = useMemo(
    () => (rows ? viewCounts(rows, currentUserId) : undefined),
    [rows, currentUserId],
  );

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
