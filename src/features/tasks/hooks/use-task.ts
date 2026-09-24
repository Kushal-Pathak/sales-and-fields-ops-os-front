import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, NotFoundError, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinTasks, type TaskRow } from '../utils/task-view-model';

/** One task for the drawer, joined like the list rows. */
export function useTask(id: string | null) {
  const task = useQuery({
    queryKey: queryKeys.tasks.detail(id ?? ''),
    queryFn: () => db.tasks.get(id ?? ''),
    enabled: id !== null,
    retry: (count, error) => !(error instanceof NotFoundError) && count < 1,
  });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const row = useMemo<TaskRow | undefined>(() => {
    if (!task.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinTasks([task.data], {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    })[0];
  }, [task.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [task, leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: task.error instanceof NotFoundError,
    error:
      queries.find((query) => query.error && !(query.error instanceof NotFoundError))?.error ??
      null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
