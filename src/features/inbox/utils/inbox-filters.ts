import type { Channel } from '@/types/domain';
import { CHANNELS } from './inbox-labels';

export const INBOX_VIEWS = ['all', 'unread', 'mine'] as const;
export type InboxView = (typeof INBOX_VIEWS)[number];

export const INBOX_VIEW_LABEL: Record<InboxView, string> = {
  all: 'All',
  unread: 'Unread',
  mine: 'Mine',
};

export interface InboxFilters {
  view: InboxView;
  q: string;
  channel: Channel | null;
}

export const DEFAULT_INBOX_FILTERS: InboxFilters = { view: 'all', q: '', channel: null };

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | null {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

export function parseInboxFilters(params: URLSearchParams): InboxFilters {
  return {
    view: oneOf(params.get('view'), INBOX_VIEWS) ?? DEFAULT_INBOX_FILTERS.view,
    q: params.get('q')?.trim() ?? '',
    channel: oneOf(params.get('channel'), CHANNELS),
  };
}

/** Writes filters into `params`, omitting defaults. The selected thread (`c`) is kept. */
export function serializeInboxFilters(
  filters: InboxFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('view', filters.view === DEFAULT_INBOX_FILTERS.view ? null : filters.view);
  set('q', filters.q.trim() || null);
  set('channel', filters.channel);
  return next;
}

export function hasActiveInboxFilters(filters: InboxFilters): boolean {
  return Boolean(filters.q.trim() || filters.channel);
}
