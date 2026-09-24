import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { isTaskOverdue } from '@/types/domain';
import { DashboardPage } from './index';

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/dashboard', element: <DashboardPage /> }], {
    initialEntries: ['/dashboard'],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const seed = buildSeed();

describe('DashboardPage', () => {
  beforeEach(() => resetDemoData());

  it('shows the headline numbers and links them to their lists', async () => {
    renderDashboard();
    const overdue = seed.tasks.filter((task) => isTaskOverdue(task)).length;
    const tile = await screen.findByRole('link', { name: /^Overdue tasks/ });
    expect(tile).toHaveAttribute('href', '/tasks?view=overdue');
    expect(within(tile).getByText(String(overdue))).toBeInTheDocument();

    const pending = seed.quotes.filter((quote) => quote.status === 'pending_approval').length;
    const quotesTile = screen.getByRole('link', { name: /^Quotes pending/ });
    expect(within(quotesTile).getByText(String(pending))).toBeInTheDocument();
  });

  it('lists overdue tasks and follow-ups in their panels', async () => {
    renderDashboard();
    const panel = await screen.findByRole('region', { name: 'Overdue tasks' });
    const first = seed.tasks
      .filter((task) => isTaskOverdue(task))
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]!;
    expect(await within(panel).findByText(first.title)).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: /View all/ })).toHaveAttribute(
      'href',
      '/tasks?view=overdue',
    );

    const followUps = await screen.findByRole('region', { name: 'Follow-ups due' });
    expect(within(followUps).getAllByRole('listitem').length).toBeGreaterThan(0);
  });

  it('renders one pipeline cell per non-lost stage', async () => {
    renderDashboard();
    const strip = await screen.findByRole('region', { name: 'Pipeline' });
    const stages = seed.stages.filter((stage) => stage.kind !== 'lost');
    for (const stage of stages) {
      expect(await within(strip).findByText(stage.name)).toBeInTheDocument();
    }
    expect(within(strip).queryByText('Lost')).not.toBeInTheDocument();
  });
});
