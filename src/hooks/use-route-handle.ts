import { useMatches } from 'react-router';
import { isRouteHandle, type RouteHandle } from '@/types/route-handle';

/** The `handle` of the deepest matched route that declares one. */
export function useRouteHandle(): RouteHandle | undefined {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i -= 1) {
    const handle = matches[i]?.handle;
    if (isRouteHandle(handle)) return handle;
  }
  return undefined;
}
