import type { AppointmentType } from '@/types/domain';
import { APPOINTMENT_TYPES } from './appointment-labels';

export const APPOINTMENT_VIEWS = [
  'upcoming',
  'today',
  'overdue',
  'completed',
  'cancelled',
  'all',
] as const;
export type AppointmentView = (typeof APPOINTMENT_VIEWS)[number];

export const APPOINTMENT_VIEW_LABEL: Record<AppointmentView, string> = {
  upcoming: 'Upcoming',
  today: 'Today',
  overdue: 'Needs outcome',
  completed: 'Completed',
  cancelled: 'Cancelled',
  all: 'All',
};

export const APPOINTMENT_SORT_KEYS = ['start', 'created'] as const;
export type AppointmentSortKey = (typeof APPOINTMENT_SORT_KEYS)[number];

export const APPOINTMENT_SORT_LABEL: Record<AppointmentSortKey, string> = {
  start: 'Start time',
  created: 'Created',
};

export interface AppointmentSort {
  key: AppointmentSortKey;
  direction: 'asc' | 'desc';
}

export interface AppointmentFilters {
  view: AppointmentView;
  q: string;
  assigneeId: string | null;
  type: AppointmentType | null;
  sort: AppointmentSort;
}

export const DEFAULT_APPOINTMENT_SORT: AppointmentSort = { key: 'start', direction: 'asc' };

export const DEFAULT_APPOINTMENT_FILTERS: AppointmentFilters = {
  view: 'upcoming',
  q: '',
  assigneeId: null,
  type: null,
  sort: DEFAULT_APPOINTMENT_SORT,
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parseSort(value: string | null): AppointmentSort {
  if (!value) return DEFAULT_APPOINTMENT_SORT;
  const direction = value.startsWith('-') ? 'desc' : 'asc';
  const key = oneOf(value.replace(/^-/, ''), APPOINTMENT_SORT_KEYS);
  return key ? { key, direction } : DEFAULT_APPOINTMENT_SORT;
}

export function parseAppointmentFilters(params: URLSearchParams): AppointmentFilters {
  return {
    view: oneOf(params.get('view'), APPOINTMENT_VIEWS) ?? DEFAULT_APPOINTMENT_FILTERS.view,
    q: params.get('q')?.trim() ?? '',
    assigneeId: params.get('assignee') || null,
    type: oneOf(params.get('type'), APPOINTMENT_TYPES),
    sort: parseSort(params.get('sort')),
  };
}

/** Writes filters into `params`, omitting defaults. Other params (e.g. `appointment`) are kept. */
export function serializeAppointmentFilters(
  filters: AppointmentFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === DEFAULT_APPOINTMENT_FILTERS.view ? null : filters.view);
  set('q', filters.q.trim() || null);
  set('assignee', filters.assigneeId);
  set('type', filters.type);
  const isDefaultSort =
    filters.sort.key === DEFAULT_APPOINTMENT_SORT.key &&
    filters.sort.direction === DEFAULT_APPOINTMENT_SORT.direction;
  set(
    'sort',
    isDefaultSort ? null : `${filters.sort.direction === 'desc' ? '-' : ''}${filters.sort.key}`,
  );
  return next;
}

export function hasActiveAppointmentFilters(filters: AppointmentFilters): boolean {
  return Boolean(filters.q.trim() || filters.assigneeId || filters.type);
}
