import { describe, expect, it } from 'vitest';
import { quoteTotals } from './quote';

describe('quoteTotals', () => {
  it('applies line discounts, then the quote discount, then tax', () => {
    const totals = quoteTotals({
      items: [
        { id: 'a', description: 'Licence', quantity: 2, unitPrice: 100 },
        { id: 'b', description: 'Setup', quantity: 1, unitPrice: 50, discountPct: 10 },
      ],
      discountPct: 5,
      taxRatePct: 10,
    });
    expect(totals).toEqual({ subtotal: 245, discount: 12.25, tax: 23.28, total: 256.03 });
  });

  it('is all zeros without items', () => {
    expect(quoteTotals({ items: [], discountPct: 10, taxRatePct: 10 })).toEqual({
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
  });
});
