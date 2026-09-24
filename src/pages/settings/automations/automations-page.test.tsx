import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { AutomationsSettingsPage } from './index';

function renderAt(path = '/settings/automations') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/settings/automations', element: <AutomationsSettingsPage /> }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();

describe('AutomationsSettingsPage', () => {
  beforeEach(() => resetDemoData());

  it('lists every rule with its description and toggles one off', async () => {
    const user = userEvent.setup();
    renderAt();
    const rows = await screen.findAllByRole('row', { name: /^Open automation/ });
    expect(rows).toHaveLength(seed.automations.length);
    expect(screen.getByText('When a lead moves to Proposal')).toBeInTheDocument();
    expect(
      screen.getByText('Create task “Follow up on the proposal” for the owner, due in 3 days'),
    ).toBeInTheDocument();

    const toggle = screen.getByRole('switch', { name: 'Proposal follow-up active' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    await waitFor(async () => {
      expect((await db.automations.get('auto-proposal')).active).toBe(false);
    });
  });

  it('creates a rule with two actions from the drawer', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'New automation' }));
    const drawer = await screen.findByRole('dialog');
    await user.type(within(drawer).getByLabelText('Name'), 'Qualified handoff');

    await user.click(within(drawer).getByRole('combobox', { name: 'Trigger' }));
    await user.click(await screen.findByRole('option', { name: 'A lead moves to a stage' }));
    await user.click(within(drawer).getByRole('combobox', { name: 'Into stage' }));
    await user.click(await screen.findByRole('option', { name: 'Qualified' }));

    await user.type(within(drawer).getByLabelText('Task title'), 'Book discovery call');
    await user.click(within(drawer).getByRole('button', { name: 'Add action' }));
    await user.type(within(drawer).getByLabelText('Note'), 'Handed to sales.');
    await user.click(within(drawer).getByRole('button', { name: 'Create automation' }));

    await waitFor(async () => {
      expect((await db.automations.list()).some((a) => a.name === 'Qualified handoff')).toBe(true);
    });
    const created = (await db.automations.list()).find((a) => a.name === 'Qualified handoff')!;
    expect(created.trigger).toEqual({ type: 'lead_stage_changed', stageId: 'stg-qualified' });
    expect(created.actions).toHaveLength(2);
    expect(created.actions[0]).toMatchObject({ type: 'create_task', title: 'Book discovery call' });
    expect(created.actions[1]).toEqual({ type: 'add_note', text: 'Handed to sales.' });
    expect(created.active).toBe(true);
    expect(
      await screen.findByRole('row', { name: 'Open automation Qualified handoff' }),
    ).toBeInTheDocument();
  });

  it('shows recent runs in the drawer', async () => {
    renderAt('/settings/automations?automation=auto-proposal');
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Recent runs')).toBeInTheDocument();
    expect(within(drawer).getAllByText('Lead moved to Proposal').length).toBe(
      seed.automationRuns.filter((run) => run.automationId === 'auto-proposal').length,
    );
  });
});
