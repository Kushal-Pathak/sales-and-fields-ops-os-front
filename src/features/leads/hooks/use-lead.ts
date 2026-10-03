import { getQueryError } from '@/data/query-state';
import { shouldRetryQuery } from '@/data/errors';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, NotFoundError, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinLeads, type LeadRow } from '../utils/lead-view-model';

/** One lead (for the drawer) joined like the list rows. `notFound` when the id no longer exists. */
export function useLead(id: string | null) {
  const lead = useQuery({
    queryKey: queryKeys.leads.detail(id ?? ''),
    queryFn: ({ signal }) => db.leads.get(id ?? '', { signal }),
    enabled: id !== null,
    retry: shouldRetryQuery,
  });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const row = useMemo<LeadRow | undefined>(() => {
    if (!lead.data || !contacts.data || !users.data || !stages.data) return undefined;
    return joinLeads([lead.data], {
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    })[0];
  }, [lead.data, contacts.data, users.data, stages.data]);

  const queries = id !== null ? [lead, contacts, users, stages] : [contacts, users, stages];
  return {
    row,
    stages: stages.data ?? [],
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: lead.error instanceof NotFoundError,
    error: getQueryError(queries.filter((query) => !(query.error instanceof NotFoundError))),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
