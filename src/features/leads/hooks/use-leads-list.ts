import { useMemo } from 'react';
import { useCurrentUser } from '@/features/workspace';
import { filterLeads, sortLeads, viewCounts } from '../utils/lead-view-model';
import { useLeadFilters } from './use-lead-filters';
import { useLeads } from './use-leads';

/** The leads page state: all rows, the visible (filtered + sorted) rows, view counts and filters. */
export function useLeadsList() {
  const { filters, update, clear, isActive } = useLeadFilters();
  const { rows, isPending, error, refetch } = useLeads();
  const currentUserId = useCurrentUser().data?.id;

  const visible = useMemo(
    () => (rows ? sortLeads(filterLeads(rows, filters, currentUserId), filters.sort) : undefined),
    [rows, filters, currentUserId],
  );
  const counts = useMemo(
    () => (rows ? viewCounts(rows, currentUserId) : undefined),
    [rows, currentUserId],
  );

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
