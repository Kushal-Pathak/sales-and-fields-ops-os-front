import { getQueryError } from '@/data/query-state';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useNow } from '@/hooks/use-now';
import { moduleRows, useModules } from '@/features/auth';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { buildDashboard, type DashboardModel } from '../utils/dashboard-model';

/**
 * Loads every collection the dashboard summarises (through the shared cache keys,
 * so it never depends on the leads/tasks features) and derives the model once.
 * Tasks, appointments and quotes are optional: a module that is closed to the user
 * is not fetched, not waited for and counts as empty.
 */
export function useDashboard() {
  const now = useNow();
  const modules = useModules();
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
  const tasks = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: ({ signal }) => db.tasks.list({ signal }),
    enabled: modules.tasks.status === 'allowed',
  });
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: ({ signal }) => db.appointments.list({ signal }),
    enabled: modules.appointments.status === 'allowed',
  });
  const quotes = useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: ({ signal }) => db.quotes.list({ signal }),
    enabled: modules.quotes.status === 'allowed',
  });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const taskRows = moduleRows(modules.tasks, tasks.data);
  const appointmentRows = moduleRows(modules.appointments, appointments.data);
  const quoteRows = moduleRows(modules.quotes, quotes.data);

  const model = useMemo<DashboardModel | undefined>(() => {
    if (
      !leads.data ||
      !taskRows ||
      !appointmentRows ||
      !quoteRows ||
      !contacts.data ||
      !users.data ||
      !stages.data
    )
      return undefined;
    return buildDashboard(
      {
        leads: leads.data,
        tasks: taskRows,
        appointments: appointmentRows,
        quotes: quoteRows,
        contacts: contacts.data,
        users: users.data,
        stages: stages.data,
      },
      now,
    );
  }, [
    now,
    leads.data,
    taskRows,
    appointmentRows,
    quoteRows,
    contacts.data,
    users.data,
    stages.data,
  ]);

  const optional = [
    { state: modules.tasks, query: tasks },
    { state: modules.appointments, query: appointments },
    { state: modules.quotes, query: quotes },
  ];
  const queries = [
    leads,
    contacts,
    users,
    stages,
    ...optional.filter(({ state }) => state.status === 'allowed').map(({ query }) => query),
  ];
  return {
    model,
    isPending:
      queries.some((query) => query.isPending) ||
      optional.some(({ state }) => state.status === 'loading'),
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
