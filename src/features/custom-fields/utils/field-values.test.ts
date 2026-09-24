import { describe, expect, it } from 'vitest';
import type { FieldDefinition } from '@/types/domain';
import { isValidKey, slugKey, uniqueKey } from './field-keys';
import {
  cleanValues,
  coerceValue,
  formatValue,
  nextFieldOrder,
  toInputValue,
  validateValues,
} from './field-values';

function field(
  partial: Partial<FieldDefinition> & Pick<FieldDefinition, 'key' | 'type'>,
): FieldDefinition {
  return {
    id: partial.key,
    entity: 'lead',
    label: partial.key,
    order: 0,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

const budget = field({ key: 'budget', type: 'number', label: 'Budget' });
const timeline = field({
  key: 'timeline',
  type: 'select',
  label: 'Timeline',
  options: ['Soon', 'Later'],
  required: true,
});
const confirmed = field({ key: 'confirmed', type: 'checkbox', label: 'Confirmed', required: true });
const when = field({ key: 'when', type: 'date', label: 'When' });

describe('field keys', () => {
  it('slugs labels into camelCase keys and keeps them unique', () => {
    expect(slugKey('Decision timeline (approx.)')).toBe('decisionTimelineApprox');
    expect(slugKey('  ')).toBe('');
    expect(uniqueKey('budget', ['budget', 'budget2'])).toBe('budget3');
    expect(isValidKey('decisionTimeline')).toBe(true);
    expect(isValidKey('1abc')).toBe(false);
  });
});

describe('field values', () => {
  it('coerces input strings into stored values and back', () => {
    expect(coerceValue(budget, ' 12 ')).toBe(12);
    expect(coerceValue(budget, 'x')).toBeUndefined();
    expect(coerceValue(budget, '')).toBeUndefined();
    expect(coerceValue(confirmed, true)).toBe(true);
    expect(coerceValue(timeline, 'Soon')).toBe('Soon');
    expect(toInputValue(budget, 12)).toBe('12');
    expect(toInputValue(confirmed, undefined)).toBe(false);
    expect(toInputValue(timeline, undefined)).toBe('');
  });

  it('validates required fields, numbers and options', () => {
    expect(validateValues([budget, timeline, confirmed], {})).toEqual({
      timeline: 'Timeline is required.',
      confirmed: 'Confirmed is required.',
    });
    expect(validateValues([timeline], { timeline: 'Never' })).toEqual({
      timeline: 'Choose one of the options.',
    });
    expect(validateValues([budget], { budget: 'abc' })).toEqual({ budget: 'Enter a number.' });
    expect(
      validateValues([budget, timeline, confirmed], { timeline: 'Soon', confirmed: true }),
    ).toEqual({});
  });

  it('cleans stray keys and blanks, formats for display, and orders new fields last', () => {
    expect(cleanValues([budget], { budget: 5, gone: 'x', empty: '' })).toEqual({ budget: 5 });
    expect(formatValue(confirmed, true)).toBe('Yes');
    expect(formatValue(budget, 12000, 'en-US')).toBe('12,000');
    expect(formatValue(when, '2026-09-24', 'en-US')).toBe('Sep 24, 2026');
    expect(formatValue(timeline, undefined)).toBe('');
    expect(
      nextFieldOrder(
        [
          { ...budget, order: 3 },
          { ...timeline, order: 1 },
        ],
        'lead',
      ),
    ).toBe(4);
    expect(nextFieldOrder([], 'contact')).toBe(0);
  });
});
