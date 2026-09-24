import { useMemo } from 'react';
import { filterQuotes, sortQuotes, viewCounts } from '../utils/quote-view-model';
import { useQuoteFilters } from './use-quote-filters';
import { useQuotes } from './use-quotes';

/** The quotes page state: all rows, the visible rows, view counts and the URL filters. */
export function useQuotesList() {
  const { filters, update, clear, isActive } = useQuoteFilters();
  const { rows, isPending, error, refetch } = useQuotes();

  const visible = useMemo(
    () => (rows ? sortQuotes(filterQuotes(rows, filters), filters.sort) : undefined),
    [rows, filters],
  );
  const counts = useMemo(() => (rows ? viewCounts(rows) : undefined), [rows]);

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
