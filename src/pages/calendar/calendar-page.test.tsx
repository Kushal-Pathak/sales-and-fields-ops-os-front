import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { addDays, dateKey, isSameDay } from '@/lib/dates';
import { CalendarPage } from './index';

function renderAt(path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/calendar', element: <CalendarPage /> }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const today = seed.appointments.find(
  (row) => row.status === 'scheduled' && isSameDay(new Date(row.startAt), new Date()),
)!;
const todayName = seed.contacts.find((c) => c.id === today.contactId)!.name;

describe('CalendarPage', () => {
  beforeEach(() => resetDemoData());

  it("shows this week's appointments and tasks, and hides tasks on request", async () => {
    const user = userEvent.setup();
    renderAt('/calendar');
    expect(
      await screen.findByRole('button', { name: `Open appointment ${todayName}` }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Open task/ }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Show tasks' }));
    await waitFor(() =>
      expect(screen.queryAllByRole('button', { name: /^Open task/ })).toHaveLength(0),
    );
    expect(
      screen.getByRole('button', { name: `Open appointment ${todayName}` }),
    ).toBeInTheDocument();
  });

  it('moves by a week and switches to the month view through the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/calendar');
    await screen.findByRole('button', { name: `Open appointment ${todayName}` });
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    await waitFor(() =>
      expect(router.state.location.search).toContain(`date=${dateKey(addDays(new Date(), 7))}`),
    );
    await user.click(screen.getByRole('tab', { name: 'Month' }));
    await waitFor(() => expect(router.state.location.search).toContain('view=month'));
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
  });

  it('opens the appointment drawer from an event', async () => {
    const user = userEvent.setup();
    const { router } = renderAt('/calendar');
    await user.click(await screen.findByRole('button', { name: `Open appointment ${todayName}` }));
    await waitFor(() => expect(router.state.location.search).toContain(`appointment=${today.id}`));
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText(todayName)).toBeInTheDocument();
  });

  it('prefills the scheduling form from a clicked slot', async () => {
    const user = userEvent.setup();
    renderAt('/calendar');
    await screen.findByRole('button', { name: `Open appointment ${todayName}` });
    const slots = screen.getAllByRole('button', { name: /^Schedule on / });
    await user.click(slots[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Schedule appointment' });
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('07:00');
  });
});
