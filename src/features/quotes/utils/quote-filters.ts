export const QUOTE_VIEWS = [
  'all',
  'draft',
  'pending',
  'approved',
  'sent',
  'accepted',
  'rejected',
] as const;
export type QuoteView = (typeof QUOTE_VIEWS)[number];

export const QUOTE_VIEW_LABEL: Record<QuoteView, string> = {
  all: 'All',
  draft: 'Drafts',
  pending: 'Pending',
  approved: 'Approved',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const QUOTE_SORT_KEYS = ['created', 'amount', 'number', 'valid'] as const;
export type QuoteSortKey = (typeof QUOTE_SORT_KEYS)[number];

export const QUOTE_SORT_LABEL: Record<QuoteSortKey, string> = {
  created: 'Created',
  amount: 'Amount',
  number: 'Quote number',
  valid: 'Valid until',
};

export interface QuoteSort {
  key: QuoteSortKey;
  direction: 'asc' | 'desc';
}

export interface QuoteFilters {
  view: QuoteView;
  q: string;
  createdById: string | null;
  sort: QuoteSort;
}

export const DEFAULT_QUOTE_SORT: QuoteSort = { key: 'created', direction: 'desc' };

export const DEFAULT_QUOTE_FILTERS: QuoteFilters = {
  view: 'all',
  q: '',
  createdById: null,
  sort: DEFAULT_QUOTE_SORT,
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function parseSort(value: string | null): QuoteSort {
  if (!value) return DEFAULT_QUOTE_SORT;
  const direction = value.startsWith('-') ? 'desc' : 'asc';
  const key = oneOf(value.replace(/^-/, ''), QUOTE_SORT_KEYS);
  return key ? { key, direction } : DEFAULT_QUOTE_SORT;
}

export function parseQuoteFilters(params: URLSearchParams): QuoteFilters {
  return {
    view: oneOf(params.get('view'), QUOTE_VIEWS) ?? DEFAULT_QUOTE_FILTERS.view,
    q: params.get('q')?.trim() ?? '',
    createdById: params.get('creator') || null,
    sort: parseSort(params.get('sort')),
  };
}

/** Writes filters into `params`, omitting defaults. Other params (e.g. `quote`) are kept. */
export function serializeQuoteFilters(
  filters: QuoteFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === DEFAULT_QUOTE_FILTERS.view ? null : filters.view);
  set('q', filters.q.trim() || null);
  set('creator', filters.createdById);
  const isDefaultSort =
    filters.sort.key === DEFAULT_QUOTE_SORT.key &&
    filters.sort.direction === DEFAULT_QUOTE_SORT.direction;
  set(
    'sort',
    isDefaultSort ? null : `${filters.sort.direction === 'desc' ? '-' : ''}${filters.sort.key}`,
  );
  return next;
}

export function hasActiveQuoteFilters(filters: QuoteFilters): boolean {
  return Boolean(filters.q.trim() || filters.createdById);
}
