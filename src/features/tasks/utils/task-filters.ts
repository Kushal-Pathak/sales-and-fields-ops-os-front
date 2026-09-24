import type { Priority, TaskType } from '@/types/domain';
import { TASK_TYPES } from './task-labels';

export const TASK_VIEWS = ['mine', 'all', 'today', 'overdue', 'upcoming', 'completed'] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const TASK_VIEW_LABEL: Record<TaskView, string> = {
  mine: 'Mine',
  all: 'All',
  today: 'Today',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

export const TASK_SORT_KEYS = ['due', 'priority', 'created'] as const;
export type TaskSortKey = (typeof TASK_SORT_KEYS)[number];

export const TASK_SORT_LABEL: Record<TaskSortKey, string> = {
  due: 'Due date',
  priority: 'Priority',
  created: 'Created',
};

export interface TaskSort {
  key: TaskSortKey;
  direction: 'asc' | 'desc';
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export interface TaskFilters {
  view: TaskView;
  q: string;
  type: TaskType | null;
  assigneeId: string | null;
  priority: Priority | null;
  sort: TaskSort;
}

export const DEFAULT_TASK_SORT: TaskSort = { key: 'due', direction: 'asc' };

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  view: 'mine',
  q: '',
  type: null,
  assigneeId: null,
  priority: null,
  sort: DEFAULT_TASK_SORT,
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parseSort(value: string | null): TaskSort {
  if (!value) return DEFAULT_TASK_SORT;
  const direction = value.startsWith('-') ? 'desc' : 'asc';
  const key = oneOf(value.replace(/^-/, ''), TASK_SORT_KEYS);
  return key ? { key, direction } : DEFAULT_TASK_SORT;
}

export function parseTaskFilters(params: URLSearchParams): TaskFilters {
  return {
    view: oneOf(params.get('view'), TASK_VIEWS) ?? DEFAULT_TASK_FILTERS.view,
    q: params.get('q')?.trim() ?? '',
    type: oneOf(params.get('type'), TASK_TYPES),
    assigneeId: params.get('assignee') || null,
    priority: oneOf(params.get('priority'), PRIORITIES),
    sort: parseSort(params.get('sort')),
  };
}

/** Writes filters into `params`, omitting defaults. Other params (e.g. `task`) are kept. */
export function serializeTaskFilters(
  filters: TaskFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === DEFAULT_TASK_FILTERS.view ? null : filters.view);
  set('q', filters.q.trim() || null);
  set('type', filters.type);
  set('assignee', filters.assigneeId);
  set('priority', filters.priority);
  const isDefaultSort =
    filters.sort.key === DEFAULT_TASK_SORT.key &&
    filters.sort.direction === DEFAULT_TASK_SORT.direction;
  set(
    'sort',
    isDefaultSort ? null : `${filters.sort.direction === 'desc' ? '-' : ''}${filters.sort.key}`,
  );
  return next;
}

export function hasActiveTaskFilters(filters: TaskFilters): boolean {
  return Boolean(filters.q.trim() || filters.type || filters.assigneeId || filters.priority);
}
