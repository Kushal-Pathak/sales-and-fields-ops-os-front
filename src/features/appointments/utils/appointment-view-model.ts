import { isSameDay } from '@/lib/dates';
import {
  isAppointmentOverdue,
  type Appointment,
  type Contact,
  type Lead,
  type Stage,
  type User,
} from '@/types/domain';
import type { AppointmentFilters, AppointmentSort, AppointmentView } from './appointment-filters';

export interface AppointmentRow {
  appointment: Appointment;
  lead: Lead | undefined;
  contact: Contact | undefined;
  stage: Stage | undefined;
  assignee: User | undefined;
}

export interface AppointmentRefs {
  leads: Lead[];
  contacts: Contact[];
  users: User[];
  stages: Stage[];
}

export function joinAppointments(
  appointments: Appointment[],
  refs: AppointmentRefs,
): AppointmentRow[] {
  const leads = new Map(refs.leads.map((row) => [row.id, row]));
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  return appointments.map((appointment) => {
    const lead = leads.get(appointment.leadId);
    return {
      appointment,
      lead,
      contact: contacts.get(appointment.contactId),
      stage: lead ? stages.get(lead.stageId) : undefined,
      assignee: users.get(appointment.assigneeId),
    };
  });
}

export function matchesView(row: AppointmentRow, view: AppointmentView, now: Date): boolean {
  const { appointment } = row;
  switch (view) {
    case 'all':
      return true;
    case 'upcoming':
      return appointment.status === 'scheduled' && new Date(appointment.endAt) >= now;
    case 'today':
      return appointment.status === 'scheduled' && isSameDay(new Date(appointment.startAt), now);
    case 'overdue':
      return isAppointmentOverdue(appointment, now);
    case 'completed':
      return appointment.status === 'completed';
    case 'cancelled':
      return appointment.status === 'cancelled';
  }
}

export function viewCounts(
  rows: AppointmentRow[],
  now = new Date(),
): Record<AppointmentView, number> {
  const counts: Record<AppointmentView, number> = {
    upcoming: 0,
    today: 0,
    overdue: 0,
    completed: 0,
    cancelled: 0,
    all: 0,
  };
  for (const row of rows) {
    for (const view of Object.keys(counts) as AppointmentView[]) {
      if (matchesView(row, view, now)) counts[view] += 1;
    }
  }
  return counts;
}

function matchesSearch(row: AppointmentRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.contact?.name, row.lead?.title, row.appointment.location].some((value) =>
    value?.toLowerCase().includes(q),
  );
}

export function filterAppointments(
  rows: AppointmentRow[],
  filters: AppointmentFilters,
  now = new Date(),
): AppointmentRow[] {
  return rows.filter(
    (row) =>
      matchesView(row, filters.view, now) &&
      matchesSearch(row, filters.q) &&
      (!filters.assigneeId || row.appointment.assigneeId === filters.assigneeId) &&
      (!filters.type || row.appointment.type === filters.type),
  );
}

const COMPARATORS: Record<
  AppointmentSort['key'],
  (a: AppointmentRow, b: AppointmentRow) => number
> = {
  start: (a, b) => a.appointment.startAt.localeCompare(b.appointment.startAt),
  created: (a, b) => a.appointment.createdAt.localeCompare(b.appointment.createdAt),
};

/** Sort by the chosen key; ties fall back to the earliest start. */
export function sortAppointments(rows: AppointmentRow[], sort: AppointmentSort): AppointmentRow[] {
  const compare = COMPARATORS[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a, b) || COMPARATORS.start(a, b));
}
