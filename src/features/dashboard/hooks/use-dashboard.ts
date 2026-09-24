import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { buildDashboard, type DashboardModel } from '../utils/dashboard-model';

/**
 * Loads every collection the dashboard summarises (through the shared cache keys,
 * so it never depends on the leads/tasks features) and derives the model once.
 */
export function useDashboard() {
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const tasks = useQuery({ queryKey: queryKeys.tasks.list(), queryFn: () => db.tasks.list() });
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => db.appointments.list(),
  });
  const quotes = useQuery({ queryKey: queryKeys.quotes.list(), queryFn: () => db.quotes.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const queries = [leads, tasks, appointments, quotes, contacts, users, stages];
  const model = useMemo<DashboardModel | undefined>(() => {
    if (
      !leads.data ||
      !tasks.data ||
      !appointments.data ||
      !quotes.data ||
      !contacts.data ||
      !users.data ||
      !stages.data
    )
      return undefined;
    return buildDashboard({
      leads: leads.data,
      tasks: tasks.data,
      appointments: appointments.data,
      quotes: quotes.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    });
  }, [
    leads.data,
    tasks.data,
    appointments.data,
    quotes.data,
    contacts.data,
    users.data,
    stages.data,
  ]);

  return {
    model,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
