import type { Quote, QuoteStatus } from '@/types/domain';

/**
 * The quote lifecycle: Draft → Pending approval → Approved | Rejected → Sent →
 * Accepted | Declined. "Revise" returns a quote to Draft so it can be edited again.
 */

export const QUOTE_ACTIONS = [
  'submit',
  'approve',
  'reject',
  'revise',
  'send',
  'accept',
  'decline',
] as const;
export type QuoteAction = (typeof QUOTE_ACTIONS)[number];

export const QUOTE_ACTION_LABEL: Record<QuoteAction, string> = {
  submit: 'Submit for approval',
  approve: 'Approve',
  reject: 'Reject',
  revise: 'Ask revision',
  send: 'Send to customer',
  accept: 'Mark accepted',
  decline: 'Mark declined',
};

/** Past-tense wording for the timeline. */
export const QUOTE_ACTION_DONE: Record<QuoteAction, string> = {
  submit: 'submitted for approval',
  approve: 'approved',
  reject: 'rejected',
  revise: 'returned to draft for revision',
  send: 'sent to customer',
  accept: 'accepted by the customer',
  decline: 'declined by the customer',
};

export const TRANSITIONS: Record<QuoteAction, { from: QuoteStatus[]; to: QuoteStatus }> = {
  submit: { from: ['draft'], to: 'pending_approval' },
  approve: { from: ['pending_approval'], to: 'approved' },
  reject: { from: ['pending_approval'], to: 'rejected' },
  revise: { from: ['pending_approval', 'approved', 'rejected'], to: 'draft' },
  send: { from: ['approved'], to: 'sent' },
  accept: { from: ['sent'], to: 'accepted' },
  decline: { from: ['sent'], to: 'declined' },
};

/** Actions allowed from `status`, in display order. */
export function availableActions(status: QuoteStatus): QuoteAction[] {
  return QUOTE_ACTIONS.filter((action) => TRANSITIONS[action].from.includes(status));
}

/** The status after `action`; throws when the move is not allowed from `status`. */
export function applyAction(status: QuoteStatus, action: QuoteAction): QuoteStatus {
  const transition = TRANSITIONS[action];
  if (!transition.from.includes(status)) {
    throw new Error(`A ${status} quote cannot be ${QUOTE_ACTION_DONE[action]}.`);
  }
  return transition.to;
}

/** Only drafts can be edited; every other status is a record of what was reviewed or sent. */
export function isQuoteEditable(status: QuoteStatus): boolean {
  return status === 'draft';
}

/** A quote that passed its validity date without a customer decision. */
export function isQuoteExpired(
  quote: Pick<Quote, 'status' | 'validUntil'>,
  now: Date = new Date(),
): boolean {
  if (!quote.validUntil) return false;
  if (quote.status === 'accepted' || quote.status === 'declined') return false;
  return new Date(quote.validUntil) < now;
}
