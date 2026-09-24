import { describe, expect, it } from 'vitest';
import { applyAction, availableActions, isQuoteEditable, isQuoteExpired } from './quote-workflow';

describe('quote workflow', () => {
  it('walks the happy path from draft to accepted', () => {
    let status = applyAction('draft', 'submit');
    expect(status).toBe('pending_approval');
    status = applyAction(status, 'approve');
    expect(status).toBe('approved');
    status = applyAction(status, 'send');
    expect(status).toBe('sent');
    expect(applyAction(status, 'accept')).toBe('accepted');
    expect(applyAction(status, 'decline')).toBe('declined');
  });

  it('offers the right actions per status', () => {
    expect(availableActions('draft')).toEqual(['submit']);
    expect(availableActions('pending_approval')).toEqual(['approve', 'reject', 'revise']);
    expect(availableActions('approved')).toEqual(['revise', 'send']);
    expect(availableActions('rejected')).toEqual(['revise']);
    expect(availableActions('sent')).toEqual(['accept', 'decline']);
    expect(availableActions('accepted')).toEqual([]);
    expect(availableActions('declined')).toEqual([]);
  });

  it('refuses illegal moves', () => {
    expect(() => applyAction('draft', 'send')).toThrow(/cannot be sent/);
    expect(() => applyAction('sent', 'approve')).toThrow();
  });

  it('only drafts are editable', () => {
    expect(isQuoteEditable('draft')).toBe(true);
    expect(isQuoteEditable('rejected')).toBe(false);
    expect(applyAction('rejected', 'revise')).toBe('draft');
  });

  it('expires open quotes after their validity date', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const past = '2026-09-01T00:00:00Z';
    const future = '2026-10-01T00:00:00Z';
    expect(isQuoteExpired({ status: 'sent', validUntil: past }, now)).toBe(true);
    expect(isQuoteExpired({ status: 'sent', validUntil: future }, now)).toBe(false);
    expect(isQuoteExpired({ status: 'accepted', validUntil: past }, now)).toBe(false);
    expect(isQuoteExpired({ status: 'draft' }, now)).toBe(false);
  });
});
