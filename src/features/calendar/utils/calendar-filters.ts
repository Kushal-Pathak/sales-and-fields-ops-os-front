import { addDays, addMonths, dateKey, parseDateKey, startOfDay } from '@/lib/dates';

export const CALENDAR_VIEWS = ['week', 'month'] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const CALENDAR_VIEW_LABEL: Record<CalendarView, string> = {
  week: 'Week',
  month: 'Month',
};

export interface CalendarFilters {
  view: CalendarView;
  /** The anchor day; the grid shows the week or month containing it. */
  date: Date;
  showTasks: boolean;
  assigneeId: string | null;
}

export function defaultCalendarFilters(now = new Date()): CalendarFilters {
  return { view: 'week', date: startOfDay(now), showTasks: true, assigneeId: null };
}

export function parseCalendarFilters(params: URLSearchParams, now = new Date()): CalendarFilters {
  const view = params.get('view');
  return {
    view: view === 'month' ? 'month' : 'week',
    date: parseDateKey(params.get('date')) ?? startOfDay(now),
    showTasks: params.get('tasks') !== '0',
    assigneeId: params.get('assignee') || null,
  };
}

/** Writes filters into `params`, omitting defaults. Other params (drawers) are kept. */
export function serializeCalendarFilters(
  filters: CalendarFilters,
  params: URLSearchParams,
  now = new Date(),
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === 'week' ? null : filters.view);
  const key = dateKey(filters.date);
  set('date', key === dateKey(now) ? null : key);
  set('tasks', filters.showTasks ? null : '0');
  set('assignee', filters.assigneeId);
  return next;
}

/** The anchor moved by whole weeks or months, depending on the view. */
export function shiftCalendar(filters: CalendarFilters, delta: number): CalendarFilters {
  const date =
    filters.view === 'week' ? addDays(filters.date, 7 * delta) : addMonths(filters.date, delta);
  return { ...filters, date };
}
