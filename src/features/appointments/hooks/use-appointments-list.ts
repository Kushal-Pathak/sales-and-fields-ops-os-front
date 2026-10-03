import { useMemo } from 'react';
import { useNow } from '@/hooks/use-now';
import { filterAppointments, sortAppointments, viewCounts } from '../utils/appointment-view-model';
import { useAppointmentFilters } from './use-appointment-filters';
import { useAppointments } from './use-appointments';

/** The appointments page state: all rows, the visible rows, view counts and the URL filters. */
export function useAppointmentsList() {
  const now = useNow();
  const { filters, update, clear, isActive } = useAppointmentFilters();
  const { rows, isPending, error, refetch } = useAppointments();

  const visible = useMemo(
    () =>
      rows ? sortAppointments(filterAppointments(rows, filters, now), filters.sort) : undefined,
    [rows, filters, now],
  );
  const counts = useMemo(() => (rows ? viewCounts(rows, now) : undefined), [rows, now]);

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
