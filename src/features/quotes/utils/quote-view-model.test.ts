import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { DEFAULT_QUOTE_FILTERS } from './quote-filters';
import { filterQuotes, joinQuotes, sortQuotes, viewCounts } from './quote-view-model';

const seed = buildSeed();
const rows = joinQuotes(seed.quotes, seed);

describe('quote view model', () => {
  it('joins the lead, contact, stage, creator and totals', () => {
    for (const row of rows) {
      expect(row.lead?.id).toBe(row.quote.leadId);
      expect(row.contact?.id).toBe(row.quote.contactId);
      expect(row.stage?.id).toBe(row.lead?.stageId);
      expect(row.createdBy?.id).toBe(row.quote.createdById);
      expect(row.totals.total).toBeGreaterThan(0);
    }
  });

  it('counts views, with rejected covering rejected and declined', () => {
    const counts = viewCounts(rows);
    expect(counts.all).toBe(rows.length);
    expect(counts.pending).toBe(
      rows.filter((row) => row.quote.status === 'pending_approval').length,
    );
    expect(counts.rejected).toBe(
      rows.filter((row) => row.quote.status === 'rejected' || row.quote.status === 'declined')
        .length,
    );
    expect(counts.rejected).toBeGreaterThan(1);
  });

  it('filters by view, search and creator', () => {
    const pending = filterQuotes(rows, { ...DEFAULT_QUOTE_FILTERS, view: 'pending' });
    expect(pending.every((row) => row.quote.status === 'pending_approval')).toBe(true);

    const first = rows[0]!;
    const byNumber = filterQuotes(rows, {
      ...DEFAULT_QUOTE_FILTERS,
      q: first.quote.number.toLowerCase(),
    });
    expect(byNumber.map((row) => row.quote.id)).toContain(first.quote.id);

    const byContact = filterQuotes(rows, { ...DEFAULT_QUOTE_FILTERS, q: first.contact!.name });
    expect(byContact.every((row) => row.contact?.name === first.contact!.name)).toBe(true);

    const byCreator = filterQuotes(rows, {
      ...DEFAULT_QUOTE_FILTERS,
      createdById: first.quote.createdById,
    });
    expect(byCreator.every((row) => row.quote.createdById === first.quote.createdById)).toBe(true);
  });

  it('sorts by amount and by number, newest first as tie-break', () => {
    const byAmount = sortQuotes(rows, { key: 'amount', direction: 'desc' });
    for (let i = 1; i < byAmount.length; i += 1) {
      expect(byAmount[i - 1]!.totals.total).toBeGreaterThanOrEqual(byAmount[i]!.totals.total);
    }
    const byNumber = sortQuotes(rows, { key: 'number', direction: 'asc' });
    expect(byNumber[0]!.quote.number).toBe('Q-1040');
    const newest = sortQuotes(rows, DEFAULT_QUOTE_FILTERS.sort);
    for (let i = 1; i < newest.length; i += 1) {
      expect(newest[i - 1]!.quote.createdAt >= newest[i]!.quote.createdAt).toBe(true);
    }
  });
});
