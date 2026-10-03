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

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

/** Whether the desktop sidebar is collapsed to its icon rail. */
export function getSidebarCollapsed(): boolean {
  return readValue<unknown>(SIDEBAR_COLLAPSED_KEY) === true;
}

export function setSidebarCollapsed(collapsed: boolean): void {
  writeValue(SIDEBAR_COLLAPSED_KEY, collapsed);
}

const DRAWER_WIDTH_KEY = 'drawer-width';
export const DEFAULT_DRAWER_WIDTH = 464;
export const MIN_DRAWER_WIDTH = 360;
export const MAX_DRAWER_WIDTH = 960;
const drawerWidthListeners = new Set<() => void>();

function normalizeDrawerWidth(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DRAWER_WIDTH;
  return Math.round(Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, value)));
}

/** Preferred desktop width, shared by all record detail drawers in this browser. */
export function getDrawerWidth(): number {
  return normalizeDrawerWidth(readValue<unknown>(DRAWER_WIDTH_KEY));
}

export function setDrawerWidth(width: number): void {
  writeValue(DRAWER_WIDTH_KEY, normalizeDrawerWidth(width));
  drawerWidthListeners.forEach((listener) => listener());
}

/** Keeps simultaneously mounted drawers in sync without a separate global provider. */
export function subscribeDrawerWidth(listener: () => void): () => void {
  drawerWidthListeners.add(listener);
  return () => drawerWidthListeners.delete(listener);
}
