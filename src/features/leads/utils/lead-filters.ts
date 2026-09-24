import type { Priority } from '@/types/domain';
import { PRIORITIES } from './priority';

export const LEAD_VIEWS = ['all', 'hot', 'mine', 'won'] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

export const LEAD_VIEW_LABEL: Record<LeadView, string> = {
  all: 'All',
  hot: 'Hot',
  mine: 'Mine',
  won: 'Won',
};

export const LEAD_SORT_KEYS = ['activity', 'created', 'value', 'priority', 'name'] as const;
export type LeadSortKey = (typeof LEAD_SORT_KEYS)[number];

export const LEAD_SORT_LABEL: Record<LeadSortKey, string> = {
  activity: 'Last activity',
  created: 'Created',
  value: 'Value',
  priority: 'Priority',
  name: 'Contact name',
};

export interface LeadSort {
  key: LeadSortKey;
  direction: 'asc' | 'desc';
}

/** Everything that narrows the leads list. Lives in the URL; see `useLeadFilters`. */
export interface LeadFilters {
  view: LeadView;
  q: string;
  stageId: string | null;
  source: string | null;
  ownerId: string | null;
  priority: Priority | null;
  sort: LeadSort;
}

export const DEFAULT_LEAD_SORT: LeadSort = { key: 'activity', direction: 'desc' };

export const DEFAULT_LEAD_FILTERS: LeadFilters = {
  view: 'all',
  q: '',
  stageId: null,
  source: null,
  ownerId: null,
  priority: null,
  sort: DEFAULT_LEAD_SORT,
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parseSort(value: string | null): LeadSort {
  if (!value) return DEFAULT_LEAD_SORT;
  const direction = value.startsWith('-') ? 'desc' : 'asc';
  const key = oneOf(value.replace(/^-/, ''), LEAD_SORT_KEYS);
  return key ? { key, direction } : DEFAULT_LEAD_SORT;
}

/** Reads filters from the query string; unknown values fall back to the defaults. */
export function parseLeadFilters(params: URLSearchParams): LeadFilters {
  return {
    view: oneOf(params.get('view'), LEAD_VIEWS) ?? 'all',
    q: params.get('q')?.trim() ?? '',
    stageId: params.get('stage') || null,
    source: params.get('source') || null,
    ownerId: params.get('owner') || null,
    priority: oneOf(params.get('priority'), PRIORITIES),
    sort: parseSort(params.get('sort')),
  };
}

/** Writes filters into `params`, omitting defaults so URLs stay short. Leaves other params alone. */
export function serializeLeadFilters(
  filters: LeadFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === 'all' ? null : filters.view);
  set('q', filters.q.trim() || null);
  set('stage', filters.stageId);
  set('source', filters.source);
  set('owner', filters.ownerId);
  set('priority', filters.priority);
  const isDefaultSort =
    filters.sort.key === DEFAULT_LEAD_SORT.key &&
    filters.sort.direction === DEFAULT_LEAD_SORT.direction;
  set(
    'sort',
    isDefaultSort ? null : `${filters.sort.direction === 'desc' ? '-' : ''}${filters.sort.key}`,
  );
  return next;
}

/** True when anything other than the view and sort narrows the list. */
export function hasActiveLeadFilters(filters: LeadFilters): boolean {
  return Boolean(
    filters.q.trim() || filters.stageId || filters.source || filters.ownerId || filters.priority,
  );
}
