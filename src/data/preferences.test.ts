import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRecentQueries,
  getRecentQueries,
  MAX_RECENT_QUERIES,
  pushRecentQuery,
} from './preferences';

describe('recent queries', () => {
  beforeEach(() => clearRecentQueries());

  it('keeps the newest first, de-duplicated and capped', () => {
    expect(getRecentQueries()).toEqual([]);
    pushRecentQuery('overdue tasks');
    pushRecentQuery('  hot leads ');
    pushRecentQuery('Overdue Tasks');
    expect(getRecentQueries()).toEqual(['Overdue Tasks', 'hot leads']);
    for (let i = 0; i < MAX_RECENT_QUERIES + 2; i += 1) pushRecentQuery(`query ${i}`);
    expect(getRecentQueries()).toHaveLength(MAX_RECENT_QUERIES);
    expect(getRecentQueries()[0]).toBe(`query ${MAX_RECENT_QUERIES + 1}`);
    expect(pushRecentQuery('   ')).toHaveLength(MAX_RECENT_QUERIES);
  });
});
