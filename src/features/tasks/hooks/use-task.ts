import { getQueryError } from '@/data/query-state';
import { shouldRetryQuery } from '@/data/errors';
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
    queryFn: ({ signal }) => db.tasks.get(id ?? '', { signal }),
    enabled: id !== null,
    retry: shouldRetryQuery,
  });
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
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

  const queries =
    id !== null ? [task, leads, contacts, users, stages] : [leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: task.error instanceof NotFoundError,
    error: getQueryError(queries.filter((query) => !(query.error instanceof NotFoundError))),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
