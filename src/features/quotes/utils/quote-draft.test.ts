import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import {
  draftFromQuote,
  draftToInput,
  draftTotals,
  emptyItem,
  hasDraftErrors,
  lineAmount,
  newDraft,
  nextQuoteNumber,
  validateDraft,
} from './quote-draft';

const seed = buildSeed();
const workspace = seed.workspace[0]!;
let counter = 0;
const newId = () => `item-${(counter += 1)}`;

describe('quote draft', () => {
  it('starts from the workspace defaults with one empty line', () => {
    const draft = newDraft(workspace, 'lead-1', newId, new Date('2026-09-24T10:00:00'));
    expect(draft.leadId).toBe('lead-1');
    expect(draft.items).toHaveLength(1);
    expect(draft.taxRatePct).toBe(String(workspace.taxRatePct));
    expect(draft.terms).toBe(workspace.quoteTerms);
    expect(draft.validUntil).toBe('2026-10-24');
  });

  it('round-trips a saved quote through the draft', () => {
    const quote = seed.quotes[0]!;
    const draft = draftFromQuote(quote);
    const input = draftToInput(draft, quote.currency);
    expect(input.items).toEqual(quote.items);
    expect(input.discountPct).toBe(quote.discountPct);
    expect(input.taxRatePct).toBe(quote.taxRatePct);
    expect(input.terms).toBe(quote.terms);
    expect(draftTotals(draft).total).toBeGreaterThan(0);
  });

  it('computes line amounts and totals while typing', () => {
    const draft = newDraft(workspace, 'lead-1', newId);
    draft.items = [
      { ...emptyItem('a'), description: 'Design', quantity: '2', unitPrice: '100' },
      {
        ...emptyItem('b'),
        description: 'Build',
        quantity: '1',
        unitPrice: '1000',
        discountPct: '10',
      },
      emptyItem('c'),
    ];
    draft.discountPct = '5';
    draft.taxRatePct = '10';
    expect(lineAmount(draft.items[1]!)).toBe(900);
    const totals = draftTotals(draft);
    expect(totals.subtotal).toBe(1100);
    expect(totals.discount).toBe(55);
    expect(totals.tax).toBe(104.5);
    expect(totals.total).toBe(1149.5);
    // The blank third line is dropped on save.
    expect(draftToInput(draft, 'USD').items).toHaveLength(2);
  });

  it('validates the lead, the lines and the percentages', () => {
    const draft = newDraft(workspace, null, newId);
    let errors = validateDraft(draft);
    expect(errors.leadId).toBeDefined();
    expect(errors.items).toBeDefined();
    expect(hasDraftErrors(errors)).toBe(true);

    draft.leadId = 'lead-1';
    draft.items = [{ ...emptyItem('a'), description: 'X', quantity: '0', unitPrice: 'abc' }];
    draft.discountPct = '120';
    errors = validateDraft(draft);
    expect(errors.itemErrors.a?.quantity).toBeDefined();
    expect(errors.itemErrors.a?.unitPrice).toBeDefined();
    expect(errors.discountPct).toBeDefined();

    draft.items = [{ ...emptyItem('a'), description: 'X', quantity: '1', unitPrice: '10' }];
    draft.discountPct = '0';
    expect(hasDraftErrors(validateDraft(draft))).toBe(false);
  });

  it('numbers the next quote after the highest in use', () => {
    expect(nextQuoteNumber([])).toBe('Q-1001');
    expect(nextQuoteNumber(seed.quotes)).toBe('Q-1050');
    expect(nextQuoteNumber([{ number: 'Q-7' }, { number: 'other' }])).toBe('Q-1001');
    expect(nextQuoteNumber([{ number: 'Q-2000' }, { number: 'Q-1999' }])).toBe('Q-2001');
  });
});
