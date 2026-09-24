import type { Appointment, AppointmentStatus, AppointmentType, Lead, User } from '@/types/domain';
import { at, type Clock } from './helpers';

/** [lead index, assignee index, type, start in days, start hour, duration hours, location, status] */
const APPOINTMENTS: [
  number,
  number,
  AppointmentType,
  number,
  number,
  number,
  string | undefined,
  AppointmentStatus,
][] = [
  [0, 2, 'on_site', 0, 11, 1, 'Harbor Dental Group, Boston', 'scheduled'],
  [1, 4, 'video_call', 0, 15, 1, 'Video call', 'scheduled'],
  [4, 2, 'phone_call', 0, 15.5, 0.5, undefined, 'scheduled'],
  [16, 5, 'on_site', 2, 10, 1.5, 'Haddad Auto Group, Detroit', 'scheduled'],
  [19, 3, 'video_call', 2, 9, 1, 'Video call', 'scheduled'],
  [11, 5, 'meeting', 2, 10, 2, 'Our office, meeting room B', 'scheduled'],
  [17, 0, 'meeting', 5, 14, 1, 'Rossi Fitness Studios, Denver', 'scheduled'],
  [7, 1, 'on_site', -1, 16, 1, 'Grant Medical Clinic, Austin', 'scheduled'],
  [9, 5, 'on_site', -4, 14, 1, 'Zahra Boutique Hotels, Miami', 'completed'],
  [6, 4, 'video_call', -6, 10, 1, 'Video call', 'completed'],
  [8, 2, 'on_site', -9, 13, 1.5, 'Bennett Home Builders, Raleigh', 'completed'],
  [14, 3, 'phone_call', -3, 11, 0.5, undefined, 'cancelled'],
];

export function buildAppointments(
  clock: Clock,
  refs: { leads: Lead[]; users: User[] },
): Appointment[] {
  return APPOINTMENTS.map((row, index) => {
    const [leadIndex, assigneeIndex, type, startDays, startHour, durationHours, location, status] =
      row;
    const lead = at(refs.leads, leadIndex, 'leads');
    const startAt = clock.daysFromNow(startDays, Math.floor(startHour), (startHour % 1) * 60);
    const endAt = new Date(new Date(startAt).getTime() + durationHours * 3_600_000).toISOString();
    return {
      id: `apt-${index + 1}`,
      leadId: lead.id,
      contactId: lead.contactId,
      assigneeId: at(refs.users, assigneeIndex, 'users').id,
      type,
      startAt,
      endAt,
      ...(location !== undefined && { location }),
      status,
      ...(status === 'completed' && {
        notes: 'Requirements confirmed; customer keen to proceed this quarter.',
        outcome: { budgetConfirmed: true, decisionMakers: 2, timeline: 'This quarter' },
      }),
      ...clock.stamp(Math.abs(startDays) + 3, Math.max(0, -startDays)),
    };
  });
}
