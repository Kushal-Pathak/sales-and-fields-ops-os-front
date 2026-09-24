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
    queryFn: () => db.leads.get(id ?? ''),
    enabled: id !== null,
    retry: (count, error) => !(error instanceof NotFoundError) && count < 1,
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

  const queries = [lead, contacts, users, stages];
  return {
    row,
    stages: stages.data ?? [],
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: lead.error instanceof NotFoundError,
    error:
      queries.find((query) => query.error && !(query.error instanceof NotFoundError))?.error ??
      null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
