import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { CreateInput, Quote, UpdateInput } from '@/types/domain';
import { nextQuoteNumber, type QuoteDraftInput } from '../utils/quote-draft';
import {
  applyAction,
  QUOTE_ACTION_DONE,
  isQuoteEditable,
  type QuoteAction,
} from '../utils/quote-workflow';

/**
 * Quote mutations. Every change writes an `Activity` on the quote (its history)
 * and on its lead (the lead timeline), because the client owns timelines until a
 * backend exists.
 */

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const AFFECTED = [queryKeys.quotes.all, queryKeys.activities.all, queryKeys.leads.all] as const;

async function log(
  quote: Quote,
  actorId: string | null,
  message: string,
  leadKind: 'quote_status' | 'quote_sent',
): Promise<void> {
  await db.activities.create({
    entityType: 'quote',
    entityId: quote.id,
    kind: 'quote_status',
    message,
    actorId,
  });
  await db.activities.create({
    entityType: 'lead',
    entityId: quote.leadId,
    kind: leadKind,
    message,
    actorId,
  });
  await db.leads.update(quote.leadId, { lastActivityAt: new Date().toISOString() });
}

export interface CreateQuoteInput {
  draft: QuoteDraftInput;
  /** Submit for approval right after saving. */
  submit?: boolean;
}

/** Creates a quote from the builder: numbers it, fills contact and creator, logs it. */
export function useCreateQuote() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ draft, submit = false }: CreateQuoteInput): Promise<Quote> => {
      if (!actorId) throw new Error('No signed-in user.');
      const [lead, quotes] = await Promise.all([db.leads.get(draft.leadId), db.quotes.list()]);
      const input: CreateInput<Quote> = {
        ...draft,
        number: nextQuoteNumber(quotes),
        contactId: lead.contactId,
        createdById: actorId,
        status: submit ? 'pending_approval' : 'draft',
      };
      const created = await db.quotes.create(input);
      await log(
        created,
        actorId,
        `Quote ${created.number} ${submit ? 'created and submitted for approval' : 'created as draft'}`,
        'quote_status',
      );
      return created;
    },
    onSuccess: () => invalidate(...AFFECTED),
  });
}

/** Edits a draft. Refuses once the quote has left Draft. */
export function useUpdateQuote() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({
      id,
      patch,
      submit = false,
    }: {
      id: string;
      patch: UpdateInput<Quote>;
      submit?: boolean;
    }): Promise<Quote> => {
      const before = await db.quotes.get(id);
      if (!isQuoteEditable(before.status)) throw new Error('Only drafts can be edited.');
      const quote = await db.quotes.update(id, {
        ...patch,
        ...(submit && { status: 'pending_approval' }),
      });
      await log(
        quote,
        actorId,
        `Quote ${quote.number} ${submit ? 'updated and submitted for approval' : 'updated'}`,
        'quote_status',
      );
      return quote;
    },
    onSuccess: (quote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(quote.id), quote);
      return invalidate(...AFFECTED);
    },
  });
}

/** Moves a quote through the workflow; sending also stamps `sentAt`. */
export function useQuoteAction() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: QuoteAction }): Promise<Quote> => {
      const before = await db.quotes.get(id);
      const status = applyAction(before.status, action);
      const patch: UpdateInput<Quote> =
        action === 'send' ? { status, sentAt: new Date().toISOString() } : { status };
      const quote = await db.quotes.update(id, patch);
      await log(
        quote,
        actorId,
        `Quote ${quote.number} ${QUOTE_ACTION_DONE[action]}`,
        action === 'send' ? 'quote_sent' : 'quote_status',
      );
      return quote;
    },
    onSuccess: (quote) => {
      queryClient.setQueryData(queryKeys.quotes.detail(quote.id), quote);
      return invalidate(...AFFECTED);
    },
  });
}

/** Copies a quote into a new draft with the next number. */
export function useDuplicateQuote() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async (id: string): Promise<Quote> => {
      if (!actorId) throw new Error('No signed-in user.');
      const [source, quotes] = await Promise.all([db.quotes.get(id), db.quotes.list()]);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      const input: CreateInput<Quote> = {
        leadId: source.leadId,
        contactId: source.contactId,
        currency: source.currency,
        items: source.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
        discountPct: source.discountPct,
        taxRatePct: source.taxRatePct,
        ...(source.notes !== undefined && { notes: source.notes }),
        ...(source.terms !== undefined && { terms: source.terms }),
        validUntil: validUntil.toISOString(),
        number: nextQuoteNumber(quotes),
        createdById: actorId,
        status: 'draft',
      };
      const created = await db.quotes.create(input);
      await log(
        created,
        actorId,
        `Quote ${created.number} created as a copy of ${source.number}`,
        'quote_status',
      );
      return created;
    },
    onSuccess: () => invalidate(...AFFECTED),
  });
}

/** Deletes a quote and its own history. The lead timeline keeps what happened. */
export function useDeleteQuote() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const activities = await db.activities.list();
      await Promise.all(
        activities
          .filter((row) => row.entityType === 'quote' && row.entityId === id)
          .map((row) => db.activities.remove(row.id)),
      );
      await db.quotes.remove(id);
    },
    onSuccess: () => invalidate(queryKeys.quotes.all, queryKeys.activities.all),
  });
}
