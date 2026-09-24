import { TASK_TYPE_COLOR, TASK_TYPE_LABEL } from '@/features/tasks';
import { addDays, dateKey, startOfDay, startOfMonth, startOfWeek } from '@/lib/dates';
import type {
  Appointment,
  AppointmentType,
  Contact,
  StatusColor,
  Task,
  User,
} from '@/types/domain';
import { APPOINTMENT_TYPE_LABEL } from '@/features/appointments';

/** One block on the grid: an appointment, or an open task at its due time. */
export interface CalendarEvent {
  id: string;
  kind: 'appointment' | 'task';
  refId: string;
  title: string;
  subtitle: string;
  startAt: string;
  endAt: string;
  color: StatusColor;
  /** Done already: drawn faded. */
  muted: boolean;
  appointmentType?: AppointmentType;
}

export interface CalendarRefs {
  appointments: Appointment[];
  tasks: Task[];
  contacts: Contact[];
  users: User[];
}

export interface CalendarOptions {
  showTasks: boolean;
  assigneeId: string | null;
}

/** Tasks have a due moment, not a duration; they take a short block. */
export const TASK_BLOCK_MINUTES = 30;

export function buildEvents(refs: CalendarRefs, options: CalendarOptions): CalendarEvent[] {
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const byAssignee = (assigneeId: string) =>
    !options.assigneeId || assigneeId === options.assigneeId;

  const events: CalendarEvent[] = refs.appointments
    .filter((row) => row.status !== 'cancelled' && byAssignee(row.assigneeId))
    .map((row) => ({
      id: `appointment:${row.id}`,
      kind: 'appointment',
      refId: row.id,
      title: contacts.get(row.contactId)?.name ?? 'Appointment',
      subtitle: [APPOINTMENT_TYPE_LABEL[row.type], users.get(row.assigneeId)?.name]
        .filter(Boolean)
        .join(' · '),
      startAt: row.startAt,
      endAt: row.endAt,
      color: 'highlight',
      muted: row.status === 'completed',
      appointmentType: row.type,
    }));

  if (options.showTasks) {
    for (const task of refs.tasks) {
      if (task.status === 'completed' || task.status === 'cancelled') continue;
      if (!byAssignee(task.assigneeId)) continue;
      events.push({
        id: `task:${task.id}`,
        kind: 'task',
        refId: task.id,
        title: task.title,
        subtitle: [TASK_TYPE_LABEL[task.type], users.get(task.assigneeId)?.name]
          .filter(Boolean)
          .join(' · '),
        startAt: task.dueAt,
        endAt: new Date(new Date(task.dueAt).getTime() + TASK_BLOCK_MINUTES * 60_000).toISOString(),
        color: TASK_TYPE_COLOR[task.type],
        muted: false,
      });
    }
  }

  return events.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

/** Monday to Sunday of the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export interface MonthCell {
  date: Date;
  inMonth: boolean;
}

/** Six full weeks covering the month of `date`, starting on the Monday before the 1st. */
export function monthCells(date: Date): MonthCell[] {
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  const month = first.getMonth();
  return Array.from({ length: 42 }, (_, index) => {
    const day = addDays(start, index);
    return { date: day, inMonth: day.getMonth() === month };
  });
}

/** Events that touch the local day, in start order. */
export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return events.filter((event) => {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();
    return start < dayEnd && end > dayStart;
  });
}

/** Groups events by local `dateKey`, keeping start order within each day. */
export function groupByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const groups = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dateKey(new Date(event.startAt));
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return groups;
}

export const DEFAULT_START_HOUR = 7;
export const DEFAULT_END_HOUR = 19;

/** The hours the week grid must show: the working day, stretched to fit every event. */
export function hourRange(events: CalendarEvent[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;
  for (const event of events) {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    startHour = Math.min(startHour, start.getHours());
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    endHour = Math.max(endHour, Math.min(24, Math.ceil(endMinutes / 60)));
  }
  return { startHour, endHour: Math.max(endHour, startHour + 1) };
}

export interface PlacedEvent {
  event: CalendarEvent;
  /** Zero-based column within its overlap group. */
  column: number;
  /** Columns in the overlap group. */
  columns: number;
}

/**
 * Lays out one day's events side by side where they overlap: a sweep assigns each
 * event the first free column, and every event in a connected overlap group shares
 * the group's column count.
 */
export function layoutDayEvents(events: CalendarEvent[]): PlacedEvent[] {
  const sorted = [...events].sort(
    (a, b) => a.startAt.localeCompare(b.startAt) || b.endAt.localeCompare(a.endAt),
  );
  const placed: PlacedEvent[] = [];
  let group: PlacedEvent[] = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const item of group) item.columns = columnEnds.length;
    group = [];
    columnEnds = [];
  };

  for (const event of sorted) {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();
    if (start >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }
    const item: PlacedEvent = { event, column, columns: 1 };
    group.push(item);
    placed.push(item);
    groupEnd = Math.max(groupEnd, end);
  }
  closeGroup();
  return placed;
}
