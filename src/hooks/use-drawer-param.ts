import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Drives a detail drawer from a URL search param (e.g. `?lead=123`), so a panel is
 * linkable and survives refresh, and closing it is just a URL change.
 *
 *   const drawer = useDrawerParam('lead');
 *   <TableRow onClick={() => drawer.open(lead.id)} />
 *   <DrawerPanel open={drawer.isOpen} onOpenChange={(open) => !open && drawer.close()} />
 */
export function useDrawerParam(key: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get(key);

  const open = useCallback(
    (nextId: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set(key, nextId);
          return next;
        },
        { replace: true },
      );
    },
    [key, setSearchParams],
  );

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        return next;
      },
      { replace: true },
    );
  }, [key, setSearchParams]);

  return { id, isOpen: id !== null, open, close };
}
