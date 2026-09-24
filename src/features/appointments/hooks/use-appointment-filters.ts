import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  hasActiveAppointmentFilters,
  parseAppointmentFilters,
  serializeAppointmentFilters,
  type AppointmentFilters,
} from '../utils/appointment-filters';

/** The appointments list state, kept in the query string. */
export function useAppointmentFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseAppointmentFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<AppointmentFilters>) => {
      setSearchParams(
        (prev) => serializeAppointmentFilters({ ...parseAppointmentFilters(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => update({ q: '', assigneeId: null, type: null }), [update]);

  return { filters, update, clear, isActive: hasActiveAppointmentFilters(filters) };
}
