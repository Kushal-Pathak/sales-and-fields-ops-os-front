import { createBrowserRouter, type RouteObject } from 'react-router';
import { RootErrorBoundary } from '@/components/common/root-error-boundary';
import { RequireAccess, RequireModule, RequireSession } from '@/features/auth';
import type { ModuleId } from '@/types/domain';
import type { RouteHandle } from '@/types/route-handle';
import { GuardedShell } from './guarded-shell';
import { HomeRedirect, ModuleOutlet } from './module-routes';

/**
 * Route table. Pages are code-split with `lazy`; add a route here when you add a page.
 * Every page route declares a `handle`: its title, breadcrumb group and the module it
 * belongs to, which must match the sidebar entry in `src/app/navigation.ts`.
 * Everything except `/sign-in` needs a session, and a page renders only when its
 * module is open to the signed-in user (`ModuleOutlet`).
 */
function handle(title: string, group?: string): RouteHandle {
  return group ? { title, group } : { title };
}

/** The handle of a page that belongs to a module, including its create/edit/import routes. */
function page(module: ModuleId, title: string, group?: string): RouteHandle {
  return { ...handle(title, group), module };
}

export const routes: RouteObject[] = [
  {
    path: '/sign-in',
    ErrorBoundary: RootErrorBoundary,
    handle: handle('Sign in'),
    lazy: async () => ({ Component: (await import('@/pages/sign-in')).SignInPage }),
  },
  {
    path: '/',
    Component: GuardedShell,
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, Component: HomeRedirect },
      {
        Component: ModuleOutlet,
        children: [
          {
            path: 'dashboard',
            handle: page('dashboard', 'Dashboard'),
            lazy: async () => ({ Component: (await import('@/pages/dashboard')).DashboardPage }),
          },

          {
            path: 'leads',
            handle: page('leads', 'Leads', 'Sales'),
            lazy: async () => ({ Component: (await import('@/pages/leads')).LeadsPage }),
          },
          {
            path: 'leads/pipeline',
            handle: page('leads', 'Pipeline', 'Sales'),
            lazy: async () => ({ Component: (await import('@/pages/pipeline')).PipelinePage }),
          },
          {
            path: 'leads/import',
            handle: page('leads', 'Import leads', 'Sales'),
            lazy: async () => ({
              Component: (await import('@/pages/leads/import')).ImportLeadsPage,
            }),
          },
          {
            path: 'quotes',
            handle: page('quotes', 'Quotes', 'Sales'),
            lazy: async () => ({ Component: (await import('@/pages/quotes')).QuotesPage }),
          },
          {
            path: 'quotes/new',
            handle: page('quotes', 'New quote', 'Quotes'),
            lazy: async () => ({ Component: (await import('@/pages/quotes/new')).NewQuotePage }),
          },
          {
            path: 'quotes/:id/edit',
            handle: page('quotes', 'Edit quote', 'Quotes'),
            lazy: async () => ({ Component: (await import('@/pages/quotes/edit')).EditQuotePage }),
          },

          {
            path: 'tasks',
            handle: page('tasks', 'Tasks', 'Work'),
            lazy: async () => ({ Component: (await import('@/pages/tasks')).TasksPage }),
          },
          {
            path: 'tasks/board',
            handle: page('tasks', 'Tasks', 'Work'),
            lazy: async () => ({ Component: (await import('@/pages/tasks/board')).TaskBoardPage }),
          },
          {
            path: 'appointments',
            handle: page('appointments', 'Appointments', 'Work'),
            lazy: async () => ({
              Component: (await import('@/pages/appointments')).AppointmentsPage,
            }),
          },
          {
            path: 'calendar',
            handle: page('calendar', 'Calendar', 'Work'),
            lazy: async () => ({ Component: (await import('@/pages/calendar')).CalendarPage }),
          },

          {
            path: 'inbox',
            handle: page('inbox', 'Inbox', 'Communication'),
            lazy: async () => ({ Component: (await import('@/pages/inbox')).InboxPage }),
          },

          {
            path: 'team',
            handle: page('team', 'Team', 'Admin'),
            lazy: async () => ({ Component: (await import('@/pages/team')).TeamPage }),
          },
          {
            path: 'team/roles',
            handle: page('team', 'Roles', 'Team'),
            lazy: async () => ({ Component: (await import('@/pages/team/roles')).RolesPage }),
          },
          {
            path: 'settings',
            handle: page('settings', 'Settings', 'Admin'),
            lazy: async () => ({ Component: (await import('@/pages/settings')).SettingsPage }),
          },
          {
            path: 'settings/pipeline',
            handle: page('settings', 'Pipeline stages', 'Settings'),
            lazy: async () => ({
              Component: (await import('@/pages/settings/pipeline')).PipelineSettingsPage,
            }),
          },
          {
            path: 'settings/fields',
            handle: page('settings', 'Custom fields', 'Settings'),
            lazy: async () => ({
              Component: (await import('@/pages/settings/fields')).FieldsSettingsPage,
            }),
          },
          {
            path: 'settings/modules',
            handle: page('settings', 'Modules', 'Settings'),
            lazy: async () => ({
              Component: (await import('@/pages/settings/modules')).ModulesSettingsPage,
            }),
          },
          {
            path: 'settings/automations',
            handle: page('settings', 'Automations', 'Settings'),
            lazy: async () => ({
              Component: (await import('@/pages/settings/automations')).AutomationsSettingsPage,
            }),
          },
        ],
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
  // Printable views live beside the shell so they render without sidebar and top bar.
  {
    path: '/quotes/:id/print',
    ErrorBoundary: RootErrorBoundary,
    handle: page('quotes', 'Print quote'),
    lazy: async () => {
      const { QuotePrintPage } = await import('@/pages/quotes/print');
      return {
        Component: () => (
          <RequireSession>
            <RequireAccess>
              <RequireModule module="quotes">
                <QuotePrintPage />
              </RequireModule>
            </RequireAccess>
          </RequireSession>
        ),
      };
    },
  },
];

export const router = createBrowserRouter(routes);
