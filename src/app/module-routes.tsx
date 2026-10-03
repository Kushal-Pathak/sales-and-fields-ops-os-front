import { Navigate, Outlet } from 'react-router';
import { RequireModule, useModules } from '@/features/auth';
import { useRouteHandle } from '@/hooks/use-route-handle';
import { adminNav, mainNav, visibleNav } from './navigation';

/**
 * Layout route around every page: renders the matched page only when the module in
 * its `handle` is open to the signed-in user. This covers a URL typed by hand.
 */
export function ModuleOutlet() {
  const module = useRouteHandle()?.module;
  if (!module) return <Outlet />;
  return (
    <RequireModule module={module}>
      <Outlet />
    </RequireModule>
  );
}

/** `/`: the first sidebar entry the user can open, so no role lands on a closed page. */
export function HomeRedirect() {
  const modules = useModules();
  const first = visibleNav([...mainNav, adminNav], (id) => modules[id].status === 'allowed')[0]
    ?.items[0];
  return <Navigate to={first?.to ?? '/dashboard'} replace />;
}
