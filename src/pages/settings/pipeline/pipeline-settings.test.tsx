import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { PipelineSettingsPage } from './index';

function renderPage(initialEntry = '/settings/pipeline') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/settings/pipeline', element: <PipelineSettingsPage /> }],
    { initialEntries: [initialEntry] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const stages = [...seed.stages].sort((a, b) => a.order - b.order);

describe('PipelineSettingsPage', () => {
  beforeEach(() => resetDemoData());

  it('lists the stages in order with their lead counts', async () => {
    renderPage();
    await screen.findByRole('button', { name: stages[0]!.name });
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('button')[1]?.textContent)).toEqual(
      stages.map((stage) => stage.name),
    );
    const proposal = stages.find((stage) => stage.name === 'Proposal')!;
    const count = seed.leads.filter((lead) => lead.stageId === proposal.id).length;
    const row = screen.getByRole('button', { name: 'Proposal' }).closest('tr')!;
    expect(within(row).getByText(String(count))).toBeInTheDocument();
  });

  it('adds a stage from the drawer', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Add stage' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Stage name'), 'On hold');
    await user.click(within(dialog).getByRole('button', { name: 'Add stage' }));

    expect(await screen.findByRole('button', { name: 'On hold' })).toBeInTheDocument();
    const saved = (await db.stages.list()).find((stage) => stage.name === 'On hold');
    expect(saved?.order).toBe(stages.length);
  });

  it('rejects a duplicate stage name', async () => {
    const user = userEvent.setup();
    renderPage('/settings/pipeline?stage=new');
    const dialog = await screen.findByRole('dialog');
    await user.type(
      await within(dialog).findByLabelText('Stage name'),
      stages[1]!.name.toUpperCase(),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Add stage' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
  });

  it('moves the leads of a deleted stage to the chosen stage', async () => {
    const user = userEvent.setup();
    renderPage();
    const proposal = stages.find((stage) => stage.name === 'Proposal')!;
    const affected = seed.leads.filter((lead) => lead.stageId === proposal.id);
    expect(affected.length).toBeGreaterThan(0);

    await user.click(await screen.findByRole('button', { name: 'Actions for Proposal' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(`${affected.length} leads are in this stage`);
    await user.click(within(dialog).getByRole('button', { name: 'Move leads and delete' }));

    await waitFor(async () => {
      expect((await db.stages.list()).some((stage) => stage.id === proposal.id)).toBe(false);
    });
    const leads = await db.leads.list();
    const qualified = stages.find((stage) => stage.name === 'Qualified')!;
    for (const lead of affected) {
      expect(leads.find((item) => item.id === lead.id)?.stageId).toBe(qualified.id);
    }
    expect(screen.queryByRole('button', { name: 'Proposal' })).not.toBeInTheDocument();
  });
});
