import { describe, expect, it } from 'vitest';
import { dateKey } from '@/lib/dates';
import {
  defaultCalendarFilters,
  parseCalendarFilters,
  serializeCalendarFilters,
  shiftCalendar,
} from './calendar-filters';

const now = new Date('2026-09-24T15:00:00');

describe('calendar filters', () => {
  it('defaults to this week with tasks shown', () => {
    const filters = parseCalendarFilters(new URLSearchParams(), now);
    expect(filters.view).toBe('week');
    expect(dateKey(filters.date)).toBe('2026-09-24');
    expect(filters.showTasks).toBe(true);
    expect(filters.assigneeId).toBeNull();
    expect(serializeCalendarFilters(filters, new URLSearchParams(), now).toString()).toBe('');
  });

  it('parses and serializes every param, keeping drawer params', () => {
    const params = new URLSearchParams('view=month&date=2026-10-05&tasks=0&assignee=usr-2&task=t1');
    const filters = parseCalendarFilters(params, now);
    expect(filters.view).toBe('month');
    expect(dateKey(filters.date)).toBe('2026-10-05');
    expect(filters.showTasks).toBe(false);
    const out = serializeCalendarFilters(filters, params, now);
    expect(out.get('task')).toBe('t1');
    expect(out.get('view')).toBe('month');
    expect(out.get('date')).toBe('2026-10-05');
    expect(out.get('tasks')).toBe('0');
    expect(parseCalendarFilters(new URLSearchParams('date=garbage'), now).date).toEqual(
      defaultCalendarFilters(now).date,
    );
  });

  it('shifts by a week or a month depending on the view', () => {
    const week = parseCalendarFilters(new URLSearchParams('date=2026-09-24'), now);
    expect(dateKey(shiftCalendar(week, 1).date)).toBe('2026-10-01');
    expect(dateKey(shiftCalendar(week, -1).date)).toBe('2026-09-17');
    const month = { ...week, view: 'month' as const };
    expect(dateKey(shiftCalendar(month, 1).date)).toBe('2026-10-01');
    expect(dateKey(shiftCalendar(month, -1).date)).toBe('2026-08-01');
  });
});
