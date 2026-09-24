import type { BaseEntity } from './base';

export type QuoteStatus =
  'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'accepted' | 'declined';

export interface QuoteLineItem {
  id: string;
  description: string;
  unit?: string;
  quantity: number;
  /** Price per unit in the quote currency. */
  unitPrice: number;
  discountPct?: number;
}

/** A priced offer for a lead. Totals are derived from `items`, never stored. */
export interface Quote extends BaseEntity {
  /** Human-readable number, e.g. `Q-1042`. */
  number: string;
  leadId: string;
  contactId: string;
  createdById: string;
  status: QuoteStatus;
  currency: string;
  items: QuoteLineItem[];
  /** Discount on the subtotal, in percent. */
  discountPct: number;
  taxRatePct: number;
  notes?: string;
  terms?: string;
  validUntil?: string;
  sentAt?: string;
}

export interface QuoteTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

/** Totals derived from the line items: per-line discounts, then the quote discount, then tax. */
export function quoteTotals(quote: {
  items: Pick<QuoteLineItem, 'quantity' | 'unitPrice' | 'discountPct'>[];
  discountPct: number;
  taxRatePct: number;
}): QuoteTotals {
  const subtotal = quote.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * (1 - (item.discountPct ?? 0) / 100),
    0,
  );
  const discount = subtotal * (quote.discountPct / 100);
  const tax = (subtotal - discount) * (quote.taxRatePct / 100);
  const round = (n: number) => Math.round(n * 100) / 100;
  const parts = { subtotal: round(subtotal), discount: round(discount), tax: round(tax) };
  // Total is built from the rounded parts so the lines a customer sees add up.
  return { ...parts, total: round(parts.subtotal - parts.discount + parts.tax) };
}
