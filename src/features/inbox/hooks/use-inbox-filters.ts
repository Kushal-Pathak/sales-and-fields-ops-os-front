import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  hasActiveInboxFilters,
  parseInboxFilters,
  serializeInboxFilters,
  type InboxFilters,
} from '../utils/inbox-filters';

/** The conversation list's view, search and channel, kept in the query string. */
export function useInboxFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseInboxFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<InboxFilters>) => {
      setSearchParams(
        (prev) => serializeInboxFilters({ ...parseInboxFilters(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => update({ q: '', channel: null }), [update]);

  return { filters, update, clear, isActive: hasActiveInboxFilters(filters) };
}
