import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, NotFoundError, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import type { Activity } from '@/types/domain';
import { joinQuotes, type QuoteRow } from '../utils/quote-view-model';

/** One quote for the drawer, the builder and the print view, joined like the list rows. */
export function useQuote(id: string | null) {
  const quote = useQuery({
    queryKey: queryKeys.quotes.detail(id ?? ''),
    queryFn: () => db.quotes.get(id ?? ''),
    enabled: id !== null,
    retry: (count, error) => !(error instanceof NotFoundError) && count < 1,
  });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const row = useMemo<QuoteRow | undefined>(() => {
    if (!quote.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinQuotes([quote.data], {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    })[0];
  }, [quote.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [quote, leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: quote.error instanceof NotFoundError,
    error:
      queries.find((query) => query.error && !(query.error instanceof NotFoundError))?.error ??
      null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

/** The quote's own timeline (status changes), newest first. */
export function useQuoteActivities(quoteId: string | null) {
  const select = useCallback(
    (rows: Activity[]) =>
      rows
        .filter((row) => row.entityType === 'quote' && row.entityId === quoteId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [quoteId],
  );
  return useQuery({
    queryKey: queryKeys.activities.list(),
    queryFn: () => db.activities.list(),
    enabled: quoteId !== null,
    select,
  });
}
