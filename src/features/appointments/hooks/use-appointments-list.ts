import { useMemo } from 'react';
import { filterAppointments, sortAppointments, viewCounts } from '../utils/appointment-view-model';
import { useAppointmentFilters } from './use-appointment-filters';
import { useAppointments } from './use-appointments';

/** The appointments page state: all rows, the visible rows, view counts and the URL filters. */
export function useAppointmentsList() {
  const { filters, update, clear, isActive } = useAppointmentFilters();
  const { rows, isPending, error, refetch } = useAppointments();

  const visible = useMemo(
    () => (rows ? sortAppointments(filterAppointments(rows, filters), filters.sort) : undefined),
    [rows, filters],
  );
  const counts = useMemo(() => (rows ? viewCounts(rows) : undefined), [rows]);

  return { rows, visible, counts, filters, update, clear, isActive, isPending, error, refetch };
}
