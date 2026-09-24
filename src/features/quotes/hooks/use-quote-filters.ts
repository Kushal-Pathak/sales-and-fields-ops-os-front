import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  hasActiveQuoteFilters,
  parseQuoteFilters,
  serializeQuoteFilters,
  type QuoteFilters,
} from '../utils/quote-filters';

/** The quotes list state, kept in the query string. */
export function useQuoteFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseQuoteFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<QuoteFilters>) => {
      setSearchParams(
        (prev) => serializeQuoteFilters({ ...parseQuoteFilters(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => update({ q: '', createdById: null }), [update]);

  return { filters, update, clear, isActive: hasActiveQuoteFilters(filters) };
}
