import { getQueryError } from '@/data/query-state';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { moduleRows, useModules } from '@/features/auth';
import { useContacts } from '@/features/contacts';
import { useUsers } from '@/features/workspace';
import type { CalendarFilters } from '../utils/calendar-filters';
import { buildEvents, type CalendarEvent } from '../utils/calendar-model';

/**
 * Every event the calendar can show. Appointments and tasks are read through the
 * shared cache keys, so the drawers that edit them refresh the grid. Each source is
 * optional: one that is closed to the user is not fetched, not waited for and adds no
 * events, and tasks are also skipped while hidden. `sources` says which ones are open.
 */
export function useCalendar(filters: Pick<CalendarFilters, 'showTasks' | 'assigneeId'>) {
  const modules = useModules();
  const sources = {
    appointments: modules.appointments.status === 'allowed',
    tasks: modules.tasks.status === 'allowed',
  };
  // With appointments closed, tasks are all there is to show, so the toggle does not apply.
  const showTasks = filters.showTasks || modules.appointments.status === 'denied';

  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: ({ signal }) => db.appointments.list({ signal }),
    enabled: sources.appointments,
  });
  const tasks = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: ({ signal }) => db.tasks.list({ signal }),
    enabled: sources.tasks && showTasks,
  });
  const contacts = useContacts();
  const users = useUsers();

  const appointmentRows = moduleRows(modules.appointments, appointments.data);
  const taskRows = showTasks ? moduleRows(modules.tasks, tasks.data) : HIDDEN_TASKS;

  const events = useMemo<CalendarEvent[] | undefined>(() => {
    if (!appointmentRows || !taskRows || !contacts.data || !users.data) return undefined;
    return buildEvents(
      {
        appointments: appointmentRows,
        tasks: taskRows,
        contacts: contacts.data,
        users: users.data,
      },
      { showTasks, assigneeId: filters.assigneeId },
    );
  }, [appointmentRows, taskRows, contacts.data, users.data, showTasks, filters.assigneeId]);

  const queries = [
    contacts,
    users,
    ...(sources.appointments ? [appointments] : []),
    ...(sources.tasks && showTasks ? [tasks] : []),
  ];
  return {
    events,
    sources,
    showTasks,
    isPending:
      queries.some((query) => query.isPending) ||
      modules.appointments.status === 'loading' ||
      modules.tasks.status === 'loading',
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

const HIDDEN_TASKS: never[] = [];
