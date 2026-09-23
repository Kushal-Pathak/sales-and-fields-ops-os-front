import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, formatRelative, initials } from './format';

describe('formatMoney', () => {
  it('drops cents for whole amounts and keeps them otherwise', () => {
    expect(formatMoney(1200, { currency: 'USD' })).toBe('$1,200');
    expect(formatMoney(1234.5, { currency: 'USD' })).toBe('$1,234.50');
    expect(formatMoney(1200, { currency: 'USD', compact: false })).toBe('$1,200.00');
  });

  it('honours currency and locale', () => {
    // Intl separates the amount and symbol with a non-breaking space.
    expect(formatMoney(1234.5, { currency: 'EUR', locale: 'de-DE' })).toBe('1.234,50 €');
    expect(formatMoney(125000, { currency: 'INR', locale: 'en-IN' })).toBe('₹1,25,000');
  });
});

describe('formatDate', () => {
  it('formats the requested style', () => {
    expect(formatDate('2026-06-20T15:30:00', 'date')).toBe('Jun 20, 2026');
    expect(formatDate('2026-06-20T15:30:00', 'monthDay')).toBe('Jun 20');
    expect(formatDate('2026-06-20T15:30:00', 'time')).toBe('3:30 PM');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-09-23T12:00:00Z');

  it('describes the past and the future', () => {
    expect(formatRelative('2026-09-23T10:00:00Z', now)).toBe('2 hours ago');
    expect(formatRelative('2026-09-26T12:00:00Z', now)).toBe('in 3 days');
    expect(formatRelative('2026-09-23T11:58:00Z', now)).toBe('2 minutes ago');
    expect(formatRelative('2026-08-01T12:00:00Z', now)).toBe('2 months ago');
  });

  it('says "just now" within 45 seconds', () => {
    expect(formatRelative('2026-09-23T11:59:40Z', now)).toBe('just now');
  });
});

describe('initials', () => {
  it('takes the first and last initials', () => {
    expect(initials('Priya Raman')).toBe('PR');
    expect(initials('Jean-Luc Picard Jr')).toBe('JJ');
    expect(initials('Cher')).toBe('C');
    expect(initials('  ')).toBe('?');
  });
});
