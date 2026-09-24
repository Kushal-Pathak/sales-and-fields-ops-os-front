import { createBrowserRouter, redirect } from 'react-router';
import { RootErrorBoundary } from '@/components/common/root-error-boundary';
import { AppShell } from '@/components/layout/app-shell';
import type { RouteHandle } from '@/types/route-handle';

/**
 * Route table. Pages are code-split with `lazy`; add a route here when you add a page.
 * Every page route declares a `handle` (title + breadcrumb group) and its path must match
 * the sidebar entry in `src/app/navigation.ts`. Unbuilt sections render `ComingSoonPage`.
 */
const comingSoon = async () => ({
  Component: (await import('@/pages/coming-soon')).ComingSoonPage,
});

function handle(title: string, group?: string): RouteHandle {
  return group ? { title, group } : { title };
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, loader: () => redirect('/dashboard') },
      {
        path: 'dashboard',
        handle: handle('Dashboard'),
        lazy: async () => ({ Component: (await import('@/pages/dashboard')).DashboardPage }),
      },

      {
        path: 'leads',
        handle: handle('Leads', 'Sales'),
        lazy: async () => ({ Component: (await import('@/pages/leads')).LeadsPage }),
      },
      {
        path: 'leads/pipeline',
        handle: handle('Pipeline', 'Sales'),
        lazy: async () => ({ Component: (await import('@/pages/pipeline')).PipelinePage }),
      },
      { path: 'quotes', handle: handle('Quotes', 'Sales'), lazy: comingSoon },

      {
        path: 'tasks',
        handle: handle('Tasks', 'Work'),
        lazy: async () => ({ Component: (await import('@/pages/tasks')).TasksPage }),
      },
      {
        path: 'tasks/board',
        handle: handle('Tasks', 'Work'),
        lazy: async () => ({ Component: (await import('@/pages/tasks/board')).TaskBoardPage }),
      },
      { path: 'appointments', handle: handle('Appointments', 'Work'), lazy: comingSoon },
      { path: 'calendar', handle: handle('Calendar', 'Work'), lazy: comingSoon },

      { path: 'inbox', handle: handle('Inbox', 'Communication'), lazy: comingSoon },

      {
        path: 'team',
        handle: handle('Team', 'Admin'),
        lazy: async () => ({ Component: (await import('@/pages/team')).TeamPage }),
      },
      {
        path: 'team/roles',
        handle: handle('Roles', 'Team'),
        lazy: async () => ({ Component: (await import('@/pages/team/roles')).RolesPage }),
      },
      {
        path: 'settings',
        handle: handle('Settings', 'Admin'),
        lazy: async () => ({ Component: (await import('@/pages/settings')).SettingsPage }),
      },
      {
        path: 'settings/pipeline',
        handle: handle('Pipeline stages', 'Settings'),
        lazy: async () => ({
          Component: (await import('@/pages/settings/pipeline')).PipelineSettingsPage,
        }),
      },
      { path: 'settings/fields', handle: handle('Custom fields', 'Settings'), lazy: comingSoon },
      {
        path: 'settings/automations',
        handle: handle('Automations', 'Settings'),
        lazy: comingSoon,
      },

      // Dev-only style guide for the design system; tree-shaken out of production builds.
      ...(import.meta.env.DEV
        ? [
            {
              path: 'design-system',
              handle: handle('Design system'),
              lazy: async () => ({
                Component: (await import('@/pages/design-system')).DesignSystemPage,
              }),
            },
          ]
        : []),
      {
        path: '*',
        handle: handle('Page not found'),
        lazy: async () => ({ Component: (await import('@/pages/not-found')).NotFoundPage }),
      },
    ],
  },
]);
