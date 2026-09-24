import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUOTE_FILTERS,
  hasActiveQuoteFilters,
  parseQuoteFilters,
  serializeQuoteFilters,
} from './quote-filters';

describe('quote filters', () => {
  it('parses defaults from an empty query string', () => {
    expect(parseQuoteFilters(new URLSearchParams())).toEqual(DEFAULT_QUOTE_FILTERS);
  });

  it('parses every param and ignores unknown values', () => {
    const filters = parseQuoteFilters(
      new URLSearchParams('view=pending&q=%20Q-10%20&creator=usr-2&sort=amount'),
    );
    expect(filters).toEqual({
      view: 'pending',
      q: 'Q-10',
      createdById: 'usr-2',
      sort: { key: 'amount', direction: 'asc' },
    });
    expect(parseQuoteFilters(new URLSearchParams('view=bogus&sort=-nope')).view).toBe('all');
    expect(parseQuoteFilters(new URLSearchParams('sort=-nope')).sort).toEqual(
      DEFAULT_QUOTE_FILTERS.sort,
    );
  });

  it('round-trips through serialize, omitting defaults and keeping other params', () => {
    const filters = parseQuoteFilters(new URLSearchParams('view=sent&creator=usr-1&sort=valid'));
    const params = serializeQuoteFilters(filters, new URLSearchParams('quote=quote-3'));
    expect(params.get('quote')).toBe('quote-3');
    expect(params.get('view')).toBe('sent');
    expect(params.get('sort')).toBe('valid');
    expect(parseQuoteFilters(params)).toEqual(filters);

    const cleared = serializeQuoteFilters(DEFAULT_QUOTE_FILTERS, params);
    expect([...cleared.keys()]).toEqual(['quote']);
  });

  it('reports active filters for search and creator only', () => {
    expect(hasActiveQuoteFilters({ ...DEFAULT_QUOTE_FILTERS, view: 'draft' })).toBe(false);
    expect(hasActiveQuoteFilters({ ...DEFAULT_QUOTE_FILTERS, q: 'x' })).toBe(true);
    expect(hasActiveQuoteFilters({ ...DEFAULT_QUOTE_FILTERS, createdById: 'usr-1' })).toBe(true);
  });
});
