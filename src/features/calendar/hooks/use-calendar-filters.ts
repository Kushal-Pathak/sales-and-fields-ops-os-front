import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  parseCalendarFilters,
  serializeCalendarFilters,
  shiftCalendar,
  type CalendarFilters,
} from '../utils/calendar-filters';

/** The calendar's view, anchor day and filters, kept in the query string. */
export function useCalendarFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseCalendarFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<CalendarFilters>) => {
      setSearchParams(
        (prev) => serializeCalendarFilters({ ...parseCalendarFilters(prev), ...patch }, prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const shift = useCallback(
    (delta: number) => {
      setSearchParams(
        (prev) => serializeCalendarFilters(shiftCalendar(parseCalendarFilters(prev), delta), prev),
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const today = useCallback(() => update({ date: new Date() }), [update]);

  return { filters, update, shift, today };
}
