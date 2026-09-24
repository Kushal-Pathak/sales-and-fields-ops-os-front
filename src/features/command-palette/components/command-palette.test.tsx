import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { CommandPaletteProvider } from '@/app/providers/command-palette-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { db, resetDemoData } from '@/data';
import { clearRecentQueries } from '@/data/preferences';
import { buildSeed } from '@/data/seed';
import { CommandPalette } from './command-palette';

function Shell() {
  const location = useLocation();
  return (
    <>
      <CommandPalette />
      <p data-testid="location">{location.pathname + location.search}</p>
      <Outlet />
    </>
  );
}

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/', element: <Shell />, children: [{ path: '*', element: <div /> }] }],
    { initialEntries: ['/dashboard'] },
  );
  render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <CommandPaletteProvider>
          <RouterProvider router={router} />
        </CommandPaletteProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
  return { router };
}

const seed = buildSeed();
const contact = seed.contacts[0]!;
const latestLead = [...seed.leads]
  .filter((row) => row.contactId === contact.id)
  .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))[0]!;
const me = seed.users.find((user) => user.active)!;

async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Meta>}k{/Meta}');
  return screen.findByRole('dialog');
}

describe('CommandPalette', () => {
  beforeEach(() => {
    resetDemoData();
    clearRecentQueries();
  });

  it('opens with ⌘K and shows suggestions, sections and quick actions', async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openPalette(user);
    expect(within(dialog).getByText('Suggested')).toBeInTheDocument();
    expect(within(dialog).getByText('Show overdue tasks')).toBeInTheDocument();
    expect(within(dialog).getByText('Requires confirmation')).toBeInTheDocument();
    expect(within(dialog).getByText('Go to')).toBeInTheDocument();
    expect(within(dialog).getByText('Toggle dark mode')).toBeInTheDocument();
  });

  it('finds a lead by contact name and navigates to it', async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openPalette(user);
    await user.type(within(dialog).getByPlaceholderText(/Search leads/), contact.name.slice(0, 5));
    await user.click((await within(dialog).findAllByText(contact.name))[0]!);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/leads?lead='));
    const opened = screen.getByTestId('location').textContent!.split('lead=')[1]!;
    expect(seed.leads.find((row) => row.id === opened)?.contactId).toBe(contact.id);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('answers "overdue tasks" locally and remembers the query', async () => {
    const user = userEvent.setup();
    renderApp();
    let dialog = await openPalette(user);
    await user.type(within(dialog).getByPlaceholderText(/Search leads/), 'overdue tasks');
    await user.click(await within(dialog).findByText('Show overdue tasks'));
    const overdue = seed.tasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.status !== 'cancelled' &&
        new Date(task.dueAt) < new Date(),
    );
    expect(await within(dialog).findByText(`${overdue.length} overdue tasks`)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Open overdue tasks/ }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/tasks?view=overdue'),
    );

    dialog = await openPalette(user);
    expect(within(dialog).getByText('Recent')).toBeInTheDocument();
    expect(within(dialog).getAllByText('overdue tasks').length).toBeGreaterThan(0);
  });

  it('prefills a task from "create a follow-up task for <name> tomorrow"', async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openPalette(user);
    const first = contact.name.split(' ')[0]!;
    await user.type(
      within(dialog).getByPlaceholderText(/Search leads/),
      `create a follow-up task for ${first} tomorrow`,
    );
    await user.click(await within(dialog).findByText(/^Create task/));
    const form = await screen.findByRole('dialog', { name: 'Add task' });
    expect(within(form).getByLabelText('Task')).toHaveValue(`Follow up with ${contact.name}`);
    expect(within(form).getByLabelText('Lead')).toHaveValue(
      `${contact.name} · ${latestLead.title}`,
    );
    await user.click(within(form).getByRole('button', { name: 'Add task' }));
    await waitFor(async () => {
      expect(
        (await db.tasks.list()).some((task) => task.title === `Follow up with ${contact.name}`),
      ).toBe(true);
    });
  });

  it('reassigns hot leads only after confirmation', async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openPalette(user);
    const owner = seed.users.find((user) => user.active && user.id !== me.id)!;
    await user.type(
      within(dialog).getByPlaceholderText(/Search leads/),
      `assign all hot leads to ${owner.name}`,
    );
    await user.click(await within(dialog).findByText(`Assign all hot leads to ${owner.name}`));
    expect(await within(dialog).findByText('Confirm action')).toBeInTheDocument();
    const before = (await db.leads.list()).filter(
      (row) => row.priority === 'high' && row.ownerId !== owner.id,
    );
    await user.click(within(dialog).getByRole('button', { name: 'Yes, proceed' }));
    await waitFor(async () => {
      const hot = (await db.leads.list()).filter(
        (row) =>
          row.priority === 'high' && seed.stages.find((s) => s.id === row.stageId)?.kind === 'open',
      );
      expect(hot.every((row) => row.ownerId === owner.id)).toBe(true);
    });
    expect(await within(dialog).findByText(/^Reassigned \d+ leads? to/)).toBeInTheDocument();
    const activities = await db.activities.list();
    expect(
      activities.filter((a) => a.kind === 'reassigned' && a.message.endsWith(owner.name)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(before.length).toBeGreaterThan(0);
  });

  it('explains that no assistant is connected for unknown questions', async () => {
    const user = userEvent.setup();
    renderApp();
    const dialog = await openPalette(user);
    await user.type(within(dialog).getByPlaceholderText(/Search leads/), 'why is the sky blue');
    await user.click(await within(dialog).findByText(/Ask the assistant/));
    expect(await within(dialog).findByText(/No assistant is connected/)).toBeInTheDocument();
  });
});
