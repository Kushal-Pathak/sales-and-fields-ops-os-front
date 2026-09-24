import { useMemo } from 'react';
import { useCurrentUser } from '@/features/workspace';
import { filterConversations, sortConversations, viewCounts } from '../utils/inbox-view-model';
import { useConversations } from './use-conversations';
import { useInboxFilters } from './use-inbox-filters';

/** The inbox list state: all rows, the visible rows, view counts and the URL filters. */
export function useInboxList() {
  const { filters, update, clear, isActive } = useInboxFilters();
  const { rows, isPending, error, refetch } = useConversations();
  const currentUserId = useCurrentUser().data?.id;

  const visible = useMemo(
    () => (rows ? sortConversations(filterConversations(rows, filters, currentUserId)) : undefined),
    [rows, filters, currentUserId],
  );
  const counts = useMemo(
    () => (rows ? viewCounts(rows, currentUserId) : undefined),
    [rows, currentUserId],
  );

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
