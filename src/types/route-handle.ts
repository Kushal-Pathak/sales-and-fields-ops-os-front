import type { ModuleId } from '@/types/domain';

/**
 * Static metadata attached to a route via React Router's `handle`.
 * Drives the breadcrumb in the top bar and the document title.
 */
export interface RouteHandle {
  /** Page title; also the breadcrumb leaf and the document title. */
  title: string;
  /** Breadcrumb root, e.g. "Sales". Omit for top-level pages. */
  group?: string;
  /** The module the page belongs to; the shell renders it only when that module is open. */
  module?: ModuleId;
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { title?: unknown }).title === 'string'
  );
}
