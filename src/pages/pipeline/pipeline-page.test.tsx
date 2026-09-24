import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { PipelinePage } from './index';

function renderPipelinePage(initialEntry = '/leads/pipeline') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/leads/pipeline', element: <PipelinePage /> }], {
    initialEntries: [initialEntry],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const stages = [...seed.stages].sort((a, b) => a.order - b.order);

describe('PipelinePage', () => {
  beforeEach(() => resetDemoData());

  it('renders one column per stage with the lead counts', async () => {
    renderPipelinePage();
    for (const stage of stages) {
      const count = seed.leads.filter((lead) => lead.stageId === stage.id).length;
      const column = await screen.findByRole('region', {
        name: `${stage.name}, ${count} lead${count === 1 ? '' : 's'}`,
      });
      expect(within(column).getByText(stage.name)).toBeInTheDocument();
    }
  });

  it('applies the URL view to the board', async () => {
    renderPipelinePage('/leads/pipeline?view=won');
    const won = stages.find((stage) => stage.kind === 'won')!;
    const wonCount = seed.leads.filter((lead) => lead.stageId === won.id).length;
    await screen.findByRole('region', { name: `${won.name}, ${wonCount} leads` });
    const first = stages[0]!;
    expect(screen.getByRole('region', { name: `${first.name}, 0 leads` })).toBeInTheDocument();
  });

  it('opens the drawer from a card', async () => {
    const user = userEvent.setup();
    const { router } = renderPipelinePage();
    const lead = seed.leads[0]!;
    const contact = seed.contacts.find((item) => item.id === lead.contactId)!;
    const card = await screen.findByRole('button', { name: `${contact.name}: ${lead.title}` });
    await user.click(card);
    await waitFor(() => expect(router.state.location.search).toContain(`lead=${lead.id}`));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
