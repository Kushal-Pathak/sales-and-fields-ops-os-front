import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinTasks, type TaskRow } from '../utils/task-view-model';

/**
 * Every task joined with its lead, contact, assignee and stage. Leads are read
 * through the shared cache key, so this feature does not depend on `features/leads`.
 */
export function useTasks() {
  const tasks = useQuery({ queryKey: queryKeys.tasks.list(), queryFn: () => db.tasks.list() });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const rows = useMemo<TaskRow[] | undefined>(() => {
    if (!tasks.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinTasks(tasks.data, {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    });
  }, [tasks.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [tasks, leads, contacts, users, stages];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

/** Lead + contact pairs for pickers, keyed like the leads feature's rows. */
export function useLeadOptions() {
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  return useMemo(() => {
    if (!leads.data || !contacts.data) return undefined;
    const byId = new Map(contacts.data.map((contact) => [contact.id, contact]));
    return leads.data.map((lead) => ({ lead, contact: byId.get(lead.contactId) }));
  }, [leads.data, contacts.data]);
}
