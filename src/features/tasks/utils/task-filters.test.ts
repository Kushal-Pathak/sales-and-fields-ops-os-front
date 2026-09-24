import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TASK_FILTERS,
  hasActiveTaskFilters,
  parseTaskFilters,
  serializeTaskFilters,
  type TaskFilters,
} from './task-filters';

describe('task filters', () => {
  it('defaults to the Mine view sorted by due date', () => {
    expect(parseTaskFilters(new URLSearchParams())).toEqual(DEFAULT_TASK_FILTERS);
    expect(serializeTaskFilters(DEFAULT_TASK_FILTERS, new URLSearchParams()).toString()).toBe('');
  });

  it('round-trips every parameter and keeps unrelated ones', () => {
    const filters: TaskFilters = {
      view: 'overdue',
      q: 'call',
      type: 'follow_up',
      assigneeId: 'usr-3',
      priority: 'high',
      sort: { key: 'priority', direction: 'desc' },
    };
    const params = serializeTaskFilters(filters, new URLSearchParams('task=task-1'));
    expect(params.get('task')).toBe('task-1');
    expect(params.get('sort')).toBe('-priority');
    expect(parseTaskFilters(params)).toEqual(filters);
  });

  it('ignores unknown values', () => {
    expect(parseTaskFilters(new URLSearchParams('view=nope&type=walk&sort=size'))).toEqual(
      DEFAULT_TASK_FILTERS,
    );
  });

  it('treats view and sort as not "active"', () => {
    expect(hasActiveTaskFilters({ ...DEFAULT_TASK_FILTERS, view: 'all' })).toBe(false);
    expect(hasActiveTaskFilters({ ...DEFAULT_TASK_FILTERS, type: 'call' })).toBe(true);
  });
});
