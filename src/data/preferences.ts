import { readValue, writeValue } from './local-store';

/** Per-browser conveniences that are not workspace data. */

const RECENT_QUERIES_KEY = 'recent-queries';
export const MAX_RECENT_QUERIES = 6;

export function getRecentQueries(): string[] {
  const stored = readValue<unknown>(RECENT_QUERIES_KEY);
  return Array.isArray(stored)
    ? stored.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Puts `text` first, drops duplicates (case-insensitively) and keeps the newest few. */
export function pushRecentQuery(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return getRecentQueries();
  const next = [
    trimmed,
    ...getRecentQueries().filter((item) => item.toLowerCase() !== trimmed.toLowerCase()),
  ].slice(0, MAX_RECENT_QUERIES);
  writeValue(RECENT_QUERIES_KEY, next);
  return next;
}

export function clearRecentQueries(): void {
  writeValue(RECENT_QUERIES_KEY, []);
}
