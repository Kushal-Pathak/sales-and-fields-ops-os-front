import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinLeads, type LeadRow } from '../utils/lead-view-model';

/** Every lead joined with its contact, owner and stage. Filtering happens in the caller. */
export function useLeads() {
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const rows = useMemo<LeadRow[] | undefined>(() => {
    if (!leads.data || !contacts.data || !users.data || !stages.data) return undefined;
    return joinLeads(leads.data, {
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    });
  }, [leads.data, contacts.data, users.data, stages.data]);

  const queries = [leads, contacts, users, stages];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
