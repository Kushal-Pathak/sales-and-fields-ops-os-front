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
