import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INBOX_FILTERS,
  hasActiveInboxFilters,
  parseInboxFilters,
  serializeInboxFilters,
} from './inbox-filters';

describe('inbox filters', () => {
  it('parses defaults and known values only', () => {
    expect(parseInboxFilters(new URLSearchParams())).toEqual(DEFAULT_INBOX_FILTERS);
    expect(parseInboxFilters(new URLSearchParams('view=mine&q=%20hi%20&channel=sms'))).toEqual({
      view: 'mine',
      q: 'hi',
      channel: 'sms',
    });
    expect(parseInboxFilters(new URLSearchParams('view=x&channel=fax'))).toEqual(
      DEFAULT_INBOX_FILTERS,
    );
  });

  it('serializes without defaults and keeps the selected thread', () => {
    const params = serializeInboxFilters(
      { view: 'unread', q: '', channel: 'email' },
      new URLSearchParams('c=conv-2'),
    );
    expect(params.get('c')).toBe('conv-2');
    expect(params.get('view')).toBe('unread');
    expect(params.get('channel')).toBe('email');
    expect(params.has('q')).toBe(false);
    expect([...serializeInboxFilters(DEFAULT_INBOX_FILTERS, params).keys()]).toEqual(['c']);
  });

  it('treats search and channel as active filters, not the view', () => {
    expect(hasActiveInboxFilters({ ...DEFAULT_INBOX_FILTERS, view: 'mine' })).toBe(false);
    expect(hasActiveInboxFilters({ ...DEFAULT_INBOX_FILTERS, channel: 'chat' })).toBe(true);
  });
});
