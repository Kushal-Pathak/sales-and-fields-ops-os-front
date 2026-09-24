import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LEAD_FILTERS,
  hasActiveLeadFilters,
  parseLeadFilters,
  serializeLeadFilters,
  type LeadFilters,
} from './lead-filters';

describe('parseLeadFilters', () => {
  it('falls back to defaults for an empty query string', () => {
    expect(parseLeadFilters(new URLSearchParams())).toEqual(DEFAULT_LEAD_FILTERS);
  });

  it('reads every parameter', () => {
    const params = new URLSearchParams(
      'view=hot&q=%20dental%20&stage=stg-new&source=Website&owner=usr-2&priority=high&sort=value',
    );
    expect(parseLeadFilters(params)).toEqual<LeadFilters>({
      view: 'hot',
      q: 'dental',
      stageId: 'stg-new',
      source: 'Website',
      ownerId: 'usr-2',
      priority: 'high',
      sort: { key: 'value', direction: 'asc' },
    });
  });

  it('ignores unknown views, priorities and sort keys', () => {
    const params = new URLSearchParams('view=bogus&priority=urgent&sort=-nope');
    expect(parseLeadFilters(params)).toEqual(DEFAULT_LEAD_FILTERS);
  });

  it('parses a leading dash as descending', () => {
    expect(parseLeadFilters(new URLSearchParams('sort=-created')).sort).toEqual({
      key: 'created',
      direction: 'desc',
    });
  });
});

describe('serializeLeadFilters', () => {
  it('omits defaults and keeps unrelated params', () => {
    const params = serializeLeadFilters(DEFAULT_LEAD_FILTERS, new URLSearchParams('lead=lead-1'));
    expect(params.toString()).toBe('lead=lead-1');
  });

  it('round-trips', () => {
    const filters: LeadFilters = {
      view: 'won',
      q: 'bakery',
      stageId: null,
      source: 'Referral',
      ownerId: 'usr-3',
      priority: 'low',
      sort: { key: 'name', direction: 'desc' },
    };
    const params = serializeLeadFilters(filters, new URLSearchParams());
    expect(params.get('sort')).toBe('-name');
    expect(parseLeadFilters(params)).toEqual(filters);
  });
});

describe('hasActiveLeadFilters', () => {
  it('ignores view and sort', () => {
    expect(
      hasActiveLeadFilters({
        ...DEFAULT_LEAD_FILTERS,
        view: 'hot',
        sort: { key: 'value', direction: 'asc' },
      }),
    ).toBe(false);
    expect(hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, q: 'x' })).toBe(true);
    expect(hasActiveLeadFilters({ ...DEFAULT_LEAD_FILTERS, ownerId: 'usr-1' })).toBe(true);
  });
});
