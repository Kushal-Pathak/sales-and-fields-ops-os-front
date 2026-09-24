import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  hasActiveLeadFilters,
  parseLeadFilters,
  serializeLeadFilters,
  type LeadFilters,
} from '../utils/lead-filters';

/**
 * The leads list state, kept in the query string so views are linkable and
 * survive refresh. Other params (e.g. the `lead` drawer) are left untouched.
 */
export function useLeadFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseLeadFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<LeadFilters>) => {
      setSearchParams(
        (prev) => serializeLeadFilters({ ...parseLeadFilters(prev), ...patch }, prev),
        {
          replace: true,
        },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(
    () => update({ q: '', stageId: null, source: null, ownerId: null, priority: null }),
    [update],
  );

  return { filters, update, clear, isActive: hasActiveLeadFilters(filters) };
}
