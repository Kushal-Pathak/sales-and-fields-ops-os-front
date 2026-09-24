import { lazy, Suspense, useEffect } from 'react';
import { Outlet } from 'react-router';
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

  useEffect(() => {
    document.title = handle ? `${handle.title} · ${env.appName}` : env.appName;
  }, [handle]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden lg:flex" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
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
