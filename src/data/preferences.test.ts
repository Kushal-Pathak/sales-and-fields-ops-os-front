import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRecentQueries,
  DEFAULT_DRAWER_WIDTH,
  getDrawerWidth,
  getRecentQueries,
  getSidebarCollapsed,
  MAX_RECENT_QUERIES,
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
  pushRecentQuery,
  setSidebarCollapsed,
  setDrawerWidth,
  subscribeDrawerWidth,
} from './preferences';
import { writeValue } from './local-store';

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

describe('sidebar collapsed', () => {
  beforeEach(() => setSidebarCollapsed(false));

  it('defaults to expanded and remembers the choice', () => {
    expect(getSidebarCollapsed()).toBe(false);
    setSidebarCollapsed(true);
    expect(getSidebarCollapsed()).toBe(true);
    setSidebarCollapsed(false);
    expect(getSidebarCollapsed()).toBe(false);
  });
});

describe('drawer width', () => {
  beforeEach(() => writeValue('drawer-width', null));

  it('defaults to the design-system width and remembers a resize', () => {
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
    setDrawerWidth(672);
    expect(getDrawerWidth()).toBe(672);
  });

  it.each([null, '672', {}, [672]])('ignores invalid stored widths: %j', (value) => {
    writeValue('drawer-width', value);
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
  });

  it('bounds stored widths, rounds pixel values, and rejects non-finite input', () => {
    setDrawerWidth(0);
    expect(getDrawerWidth()).toBe(MIN_DRAWER_WIDTH);
    setDrawerWidth(10000);
    expect(getDrawerWidth()).toBe(MAX_DRAWER_WIDTH);
    setDrawerWidth(672.4);
    expect(getDrawerWidth()).toBe(672);
    setDrawerWidth(Infinity);
    expect(getDrawerWidth()).toBe(DEFAULT_DRAWER_WIDTH);
  });

  it('notifies other mounted drawers and removes unsubscribed listeners', () => {
    const seen: number[] = [];
    const unsubscribe = subscribeDrawerWidth(() => seen.push(getDrawerWidth()));
    setDrawerWidth(672);
    unsubscribe();
    setDrawerWidth(720);
    expect(seen).toEqual([672]);
  });
});
