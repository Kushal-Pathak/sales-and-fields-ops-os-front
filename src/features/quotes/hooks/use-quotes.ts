import { getQueryError } from '@/data/query-state';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinQuotes, type QuoteRow } from '../utils/quote-view-model';

/**
 * Every quote joined with its lead, contact, stage and creator. Leads are read
 * through the shared cache key, so this feature does not depend on `features/leads`.
 */
export function useQuotes() {
  const quotes = useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: ({ signal }) => db.quotes.list({ signal }),
  });
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const rows = useMemo<QuoteRow[] | undefined>(() => {
    if (!quotes.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinQuotes(quotes.data, {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    });
  }, [quotes.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [quotes, leads, contacts, users, stages];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: getQueryError(queries),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export interface LeadOption {
  lead: { id: string; title: string; contactId: string };
  contact: { name: string } | undefined;
}

/** Lead + contact pairs for the builder's lead picker (same shape as the tasks feature's). */
export function useLeadOptions(): LeadOption[] | undefined {
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
  const contacts = useContacts();
  return useMemo(() => {
    if (!leads.data || !contacts.data) return undefined;
    const byId = new Map(contacts.data.map((contact) => [contact.id, contact]));
    return leads.data.map((lead) => ({ lead, contact: byId.get(lead.contactId) }));
  }, [leads.data, contacts.data]);
}
