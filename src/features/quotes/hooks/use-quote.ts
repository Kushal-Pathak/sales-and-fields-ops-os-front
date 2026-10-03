import { getQueryError } from '@/data/query-state';
import { shouldRetryQuery } from '@/data/errors';
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
    queryFn: ({ signal }) => db.quotes.get(id ?? '', { signal }),
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

  const queries =
    id !== null ? [quote, leads, contacts, users, stages] : [leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: quote.error instanceof NotFoundError,
    error: getQueryError(queries.filter((query) => !(query.error instanceof NotFoundError))),
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
    queryFn: ({ signal }) => db.activities.list({ signal }),
    enabled: quoteId !== null,
    select,
  });
}
