import { render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { demoSession } from '@/data/session';
import type { ModuleId, Permission } from '@/types/domain';
import { Providers } from './providers';
import { routes } from './router';

/** The real route table and providers, opened at `path` as a seeded member. */
async function openApp(path: string, userId = 'usr-1') {
  await demoSession.signIn({ kind: 'demo', userId });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <Providers>
      <RouterProvider router={router} />
    </Providers>,
  );
  return router;
}

async function switchOff(...ids: ModuleId[]) {
  const workspace = (await db.workspace.list())[0]!;
  await db.workspace.update(workspace.id, {
    modules: workspace.modules.map((module) =>
      ids.includes(module.id) ? { ...module, enabled: false } : module,
    ),
  });
}

async function revoke(roleId: string, ...permissions: Permission[]) {
  const role = await db.roles.get(roleId);
  await db.roles.update(roleId, {
    permissions: role.permissions.filter((key) => !permissions.includes(key)),
  });
}

const sidebar = () => screen.findByRole('navigation', { name: 'Main' });

describe('module access through the real routes', () => {
  beforeEach(() => resetDemoData());
  afterEach(async () => {
    vi.restoreAllMocks();
    await demoSession.signOut();
  });

  it('shows a module that is switched off as a page that does not exist, at a typed URL too', async () => {
    await switchOff('quotes');
    const quotes = vi.spyOn(db.quotes, 'list');
    await openApp('/quotes');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    const nav = await sidebar();
    expect(within(nav).getByRole('link', { name: 'Leads' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Quotes' })).not.toBeInTheDocument();
    expect(quotes).not.toHaveBeenCalled();
  });

  it('guards create and print routes of a switched-off module as well', async () => {
    await switchOff('quotes');
    await openApp('/quotes/new');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'New quote' })).not.toBeInTheDocument();
  });

  it.each(['/dashboard', '/tasks', '/inbox', '/team', '/settings'])(
    'guards %s before reading Leads when that prerequisite is unavailable',
    async (path) => {
      await switchOff('leads');
      const leads = vi.spyOn(db.leads, 'list');
      const tasks = vi.spyOn(db.tasks, 'list');
      const conversations = vi.spyOn(db.conversations, 'list');
      await openApp(path);
      expect(await screen.findByText('Page not found')).toBeInTheDocument();
      expect(leads).not.toHaveBeenCalled();
      expect(tasks).not.toHaveBeenCalled();
      expect(conversations).not.toHaveBeenCalled();
    },
  );

  it('tells a member whose role cannot open a module, rather than hiding that it exists', async () => {
    await revoke('role-sales', 'quotes.view');
    await openApp('/quotes', 'usr-3');
    expect(await screen.findByText('You don’t have access to Quotes')).toBeInTheDocument();
    expect(within(await sidebar()).queryByRole('link', { name: 'Quotes' })).not.toBeInTheDocument();
  });

  it('keeps the calendar with only appointments when tasks are switched off', async () => {
    await switchOff('tasks');
    const tasks = vi.spyOn(db.tasks, 'list');
    await openApp('/calendar');
    expect(
      (await screen.findAllByRole('button', { name: /^Open appointment/ })).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^Open task/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show tasks' })).not.toBeInTheDocument();
    expect(tasks).not.toHaveBeenCalled();
  });

  it('closes the calendar once neither appointments nor tasks are available', async () => {
    await switchOff('tasks', 'appointments');
    await openApp('/calendar');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
    expect(
      within(await sidebar()).queryByRole('link', { name: 'Calendar' }),
    ).not.toBeInTheDocument();
  });

  it('sends `/` to the first page the member can open', async () => {
    const router = await openApp('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });
});
