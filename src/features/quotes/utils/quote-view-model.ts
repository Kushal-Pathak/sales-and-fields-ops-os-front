import {
  quoteTotals,
  type Contact,
  type Lead,
  type Quote,
  type QuoteTotals,
  type Stage,
  type User,
} from '@/types/domain';
import type { QuoteFilters, QuoteSort, QuoteView } from './quote-filters';

export interface QuoteRow {
  quote: Quote;
  lead: Lead | undefined;
  contact: Contact | undefined;
  stage: Stage | undefined;
  createdBy: User | undefined;
  totals: QuoteTotals;
}

export interface QuoteRefs {
  leads: Lead[];
  contacts: Contact[];
  users: User[];
  stages: Stage[];
}

export function joinQuotes(quotes: Quote[], refs: QuoteRefs): QuoteRow[] {
  const leads = new Map(refs.leads.map((row) => [row.id, row]));
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  return quotes.map((quote) => {
    const lead = leads.get(quote.leadId);
    return {
      quote,
      lead,
      contact: contacts.get(quote.contactId),
      stage: lead ? stages.get(lead.stageId) : undefined,
      createdBy: users.get(quote.createdById),
      totals: quoteTotals(quote),
    };
  });
}

export function matchesView(row: QuoteRow, view: QuoteView): boolean {
  const { status } = row.quote;
  switch (view) {
    case 'all':
      return true;
    case 'draft':
      return status === 'draft';
    case 'pending':
      return status === 'pending_approval';
    case 'approved':
      return status === 'approved';
    case 'sent':
      return status === 'sent';
    case 'accepted':
      return status === 'accepted';
    case 'rejected':
      return status === 'rejected' || status === 'declined';
  }
}

export function viewCounts(rows: QuoteRow[]): Record<QuoteView, number> {
  const counts: Record<QuoteView, number> = {
    all: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    sent: 0,
    accepted: 0,
    rejected: 0,
  };
  for (const row of rows) {
    for (const view of Object.keys(counts) as QuoteView[]) {
      if (matchesView(row, view)) counts[view] += 1;
    }
  }
  return counts;
}

function matchesSearch(row: QuoteRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.quote.number, row.contact?.name, row.lead?.title].some((value) =>
    value?.toLowerCase().includes(q),
  );
}

export function filterQuotes(rows: QuoteRow[], filters: QuoteFilters): QuoteRow[] {
  return rows.filter(
    (row) =>
      matchesView(row, filters.view) &&
      matchesSearch(row, filters.q) &&
      (!filters.createdById || row.quote.createdById === filters.createdById),
  );
}

const COMPARATORS: Record<QuoteSort['key'], (a: QuoteRow, b: QuoteRow) => number> = {
  created: (a, b) => a.quote.createdAt.localeCompare(b.quote.createdAt),
  amount: (a, b) => a.totals.total - b.totals.total,
  number: (a, b) => a.quote.number.localeCompare(b.quote.number, undefined, { numeric: true }),
  valid: (a, b) => (a.quote.validUntil ?? '').localeCompare(b.quote.validUntil ?? ''),
};

/** Sort by the chosen key; ties fall back to the newest quote first. */
export function sortQuotes(rows: QuoteRow[], sort: QuoteSort): QuoteRow[] {
  const compare = COMPARATORS[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a, b) || COMPARATORS.created(b, a));
}
