import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { LeadAppointmentList } from '@/features/appointments';
import { isAppointmentOverdue } from '@/types/domain';
import { AppointmentsPage } from './index';

function renderAt(path: string, element = <AppointmentsPage />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/appointments', element }], {
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
const me = seed.users.find((user) => user.active)!;
const contactOf = (contactId: string) => seed.contacts.find((c) => c.id === contactId)!.name;

describe('AppointmentsPage', () => {
  beforeEach(() => resetDemoData());

  it('opens on Upcoming with counts on the tabs', async () => {
    renderAt('/appointments');
    expect(await screen.findByText(`${seed.appointments.length} appointments`)).toBeInTheDocument();
    const upcoming = seed.appointments.filter(
      (row) => row.status === 'scheduled' && new Date(row.endAt) >= new Date(),
    );
    expect(screen.getAllByRole('row', { name: /^Open appointment/ })).toHaveLength(upcoming.length);
    const overdue = seed.appointments.filter((row) => isAppointmentOverdue(row)).length;
    expect(overdue).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /^Needs outcome/ })).toHaveTextContent(String(overdue));
  });

  it('completes an appointment with outcome notes and logs it on the lead', async () => {
    const user = userEvent.setup();
    const appointment = seed.appointments.find((row) => isAppointmentOverdue(row))!;
    renderAt(`/appointments?view=all&appointment=${appointment.id}`);
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText(contactOf(appointment.contactId))).toBeInTheDocument();
    await user.click(within(drawer).getByRole('button', { name: 'Mark completed' }));

    const dialog = await screen.findByRole('dialog', { name: 'Mark as completed' });
    await user.type(within(dialog).getByLabelText('Outcome notes'), 'Agreed on scope.');
    await user.click(within(dialog).getByRole('button', { name: 'Mark completed' }));

    await waitFor(async () => {
      expect((await db.appointments.get(appointment.id)).status).toBe('completed');
    });
    expect((await db.appointments.get(appointment.id)).notes).toBe('Agreed on scope.');
    const activities = await db.activities.list();
    expect(
      activities.some(
        (activity) =>
          activity.entityId === appointment.leadId &&
          activity.kind === 'appointment_completed' &&
          activity.message.includes('Agreed on scope.') &&
          activity.actorId === me.id,
      ),
    ).toBe(true);
    expect(await within(drawer).findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('cancels and restores from the drawer', async () => {
    const user = userEvent.setup();
    const appointment = seed.appointments.find(
      (row) => row.status === 'scheduled' && !isAppointmentOverdue(row),
    )!;
    renderAt(`/appointments?appointment=${appointment.id}`);
    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Cancel appointment' }));
    await waitFor(async () => {
      expect((await db.appointments.get(appointment.id)).status).toBe('cancelled');
    });
    await user.click(await within(drawer).findByRole('button', { name: 'Restore' }));
    await waitFor(async () => {
      expect((await db.appointments.get(appointment.id)).status).toBe('scheduled');
    });
  });

  it('schedules from the lead drawer list with the lead preselected', async () => {
    const user = userEvent.setup();
    const lead = seed.leads[3]!;
    renderAt('/appointments', <LeadAppointmentList leadId={lead.id} />);
    await user.click(await screen.findByRole('button', { name: 'Schedule' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Lead')).toHaveValue(
      `${contactOf(lead.contactId)} · ${lead.title}`,
    );
    const date = within(dialog).getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2030-03-04');
    const time = within(dialog).getByLabelText('Start time');
    await user.clear(time);
    await user.type(time, '14:30');
    await user.type(within(dialog).getByLabelText('Location'), 'Their office');
    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }));

    await waitFor(async () => {
      expect((await db.appointments.list()).some((row) => row.leadId === lead.id)).toBe(true);
    });
    const created = (await db.appointments.list()).find((row) => row.leadId === lead.id)!;
    expect(created.contactId).toBe(lead.contactId);
    expect(created.assigneeId).toBe(me.id);
    expect(created.status).toBe('scheduled');
    expect(created.location).toBe('Their office');
    expect(new Date(created.startAt).getHours()).toBe(14);
    expect(new Date(created.endAt).getTime() - new Date(created.startAt).getTime()).toBe(
      60 * 60_000,
    );
    const activities = await db.activities.list();
    expect(
      activities.some(
        (activity) => activity.entityId === lead.id && activity.kind === 'appointment_scheduled',
      ),
    ).toBe(true);
  });
});
