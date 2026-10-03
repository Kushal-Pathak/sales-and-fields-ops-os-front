import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/data/preferences';
import { useRouteHandle } from '@/hooks/use-route-handle';
import { env } from '@/lib/env';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

// The palette pulls in several features' dialogs, so it loads as its own chunk.
const CommandPalette = lazy(() =>
  import('@/features/command-palette').then((module) => ({ default: module.CommandPalette })),
);

/**
 * Application frame: fixed-height sidebar + top bar, with the page as the only
 * scrolling region. Pages render `PageHeader` + `PageBody`; full-height screens
 * manage their own scroll inside `<main>`.
 */
export function AppShell() {
  const handle = useRouteHandle();
  const sidebar = useSidebarCollapsed();

  useEffect(() => {
    document.title = handle ? `${handle.title} · ${env.appName}` : env.appName;
  }, [handle]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar id="desktop-navigation" className="hidden lg:flex" collapsed={sidebar.collapsed} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar sidebarCollapsed={sidebar.collapsed} onToggleSidebar={sidebar.toggle} />
        <main className="flex min-h-0 flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </div>
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>
    </div>
  );
}

/** Desktop sidebar width, remembered per browser and toggled with ⌘B / Ctrl-B. */
function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(getSidebarCollapsed);
  const toggle = useCallback(() => setCollapsed((current) => !current), []);

  useEffect(() => setSidebarCollapsed(collapsed), [collapsed]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  return { collapsed, toggle };
}
