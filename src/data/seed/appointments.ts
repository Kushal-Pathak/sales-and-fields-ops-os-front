import type { Appointment, AppointmentStatus, Lead, User } from '@/types/domain';
import { at, type Clock } from './helpers';

/** [lead index, assignee index, start in days, start hour, duration hours, location, status] */
const APPOINTMENTS: [number, number, number, number, number, string, AppointmentStatus][] = [
  [0, 2, 0, 11, 1, 'Harbor Dental Group, Boston', 'scheduled'],
  [1, 4, 0, 15, 1, 'Video call', 'scheduled'],
  [16, 5, 2, 10, 1.5, 'Haddad Auto Group, Detroit', 'scheduled'],
  [19, 3, 2, 9, 1, 'Video call', 'scheduled'],
  [11, 5, 2, 10, 2, 'Okoye Legal Partners, Atlanta', 'scheduled'],
  [9, 5, -4, 14, 1, 'Zahra Boutique Hotels, Miami', 'completed'],
  [6, 4, -6, 10, 1, 'Video call', 'completed'],
  [8, 2, -9, 13, 1.5, 'Bennett Home Builders, Raleigh', 'completed'],
];

export function buildAppointments(
  clock: Clock,
  refs: { leads: Lead[]; users: User[] },
): Appointment[] {
  return APPOINTMENTS.map((row, index) => {
    const [leadIndex, assigneeIndex, startDays, startHour, durationHours, location, status] = row;
    const lead = at(refs.leads, leadIndex, 'leads');
    const startAt = clock.daysFromNow(startDays, startHour);
    const endAt = new Date(new Date(startAt).getTime() + durationHours * 3_600_000).toISOString();
    return {
      id: `apt-${index + 1}`,
      leadId: lead.id,
      contactId: lead.contactId,
      assigneeId: at(refs.users, assigneeIndex, 'users').id,
      startAt,
      endAt,
      location,
      status,
      ...(status === 'completed' && {
        notes: 'Requirements confirmed on site; customer keen to proceed this quarter.',
        outcome: { budgetConfirmed: true, decisionMakers: 2, timeline: 'This quarter' },
      }),
      ...clock.stamp(Math.abs(startDays) + 3, Math.max(0, -startDays)),
    };
  });
}
