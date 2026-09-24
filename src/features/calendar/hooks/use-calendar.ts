import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useUsers } from '@/features/workspace';
import type { CalendarFilters } from '../utils/calendar-filters';
import { buildEvents, type CalendarEvent } from '../utils/calendar-model';

/**
 * Every event the calendar can show. Appointments and tasks are read through the
 * shared cache keys, so the drawers that edit them refresh the grid.
 */
export function useCalendar(filters: Pick<CalendarFilters, 'showTasks' | 'assigneeId'>) {
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => db.appointments.list(),
  });
  const tasks = useQuery({ queryKey: queryKeys.tasks.list(), queryFn: () => db.tasks.list() });
  const contacts = useContacts();
  const users = useUsers();

  const events = useMemo<CalendarEvent[] | undefined>(() => {
    if (!appointments.data || !tasks.data || !contacts.data || !users.data) return undefined;
    return buildEvents(
      {
        appointments: appointments.data,
        tasks: tasks.data,
        contacts: contacts.data,
        users: users.data,
      },
      { showTasks: filters.showTasks, assigneeId: filters.assigneeId },
    );
  }, [
    appointments.data,
    tasks.data,
    contacts.data,
    users.data,
    filters.showTasks,
    filters.assigneeId,
  ]);

  const queries = [appointments, tasks, contacts, users];
  return {
    events,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
