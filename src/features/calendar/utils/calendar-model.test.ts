import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { dateKey } from '@/lib/dates';
import {
  buildEvents,
  eventsForDay,
  hourRange,
  layoutDayEvents,
  monthCells,
  weekDays,
  type CalendarEvent,
} from './calendar-model';

const now = new Date();
const seed = buildSeed(now);

function event(id: string, start: string, end: string): CalendarEvent {
  return {
    id,
    kind: 'appointment',
    refId: id,
    title: id,
    subtitle: '',
    startAt: new Date(start).toISOString(),
    endAt: new Date(end).toISOString(),
    color: 'highlight',
    muted: false,
  };
}

describe('calendar model', () => {
  it('builds appointment and task events, skipping cancelled and done ones', () => {
    const events = buildEvents(seed, { showTasks: true, assigneeId: null });
    const appointments = events.filter((e) => e.kind === 'appointment');
    const tasks = events.filter((e) => e.kind === 'task');
    expect(appointments).toHaveLength(
      seed.appointments.filter((row) => row.status !== 'cancelled').length,
    );
    expect(appointments.some((e) => e.muted)).toBe(true);
    expect(tasks).toHaveLength(
      seed.tasks.filter((row) => row.status === 'pending' || row.status === 'in_progress').length,
    );
    expect(
      buildEvents(seed, { showTasks: false, assigneeId: null }).every(
        (e) => e.kind === 'appointment',
      ),
    ).toBe(true);

    const me = seed.users[0]!;
    const mine = buildEvents(seed, { showTasks: true, assigneeId: me.id });
    expect(mine.length).toBeGreaterThan(0);
    for (const e of mine) {
      const source =
        e.kind === 'task'
          ? seed.tasks.find((t) => t.id === e.refId)!
          : seed.appointments.find((a) => a.id === e.refId)!;
      expect(source.assigneeId).toBe(me.id);
    }
  });

  it('spans Monday to Sunday and six weeks for a month', () => {
    const days = weekDays(new Date('2026-09-24T12:00:00'));
    expect(days.map(dateKey)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    const cells = monthCells(new Date('2026-09-10T12:00:00'));
    expect(cells).toHaveLength(42);
    expect(dateKey(cells[0]!.date)).toBe('2026-08-31');
    expect(cells[0]!.inMonth).toBe(false);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
    expect(dateKey(monthCells(new Date('2027-01-01T00:00:00'))[0]!.date)).toBe('2026-12-28');
  });

  it('finds the events touching a day and stretches the hour range', () => {
    const a = event('a', '2026-09-24T08:30:00', '2026-09-24T09:30:00');
    const late = event('late', '2026-09-24T20:00:00', '2026-09-24T21:15:00');
    const other = event('other', '2026-09-25T10:00:00', '2026-09-25T11:00:00');
    expect(
      eventsForDay([a, late, other], new Date('2026-09-24T00:00:00')).map((e) => e.id),
    ).toEqual(['a', 'late']);
    expect(hourRange([])).toEqual({ startHour: 7, endHour: 19 });
    const early = event('early', '2026-09-24T06:15:00', '2026-09-24T07:00:00');
    expect(hourRange([early, late])).toEqual({ startHour: 6, endHour: 22 });
  });

  it('lays overlapping events out in columns', () => {
    const a = event('a', '2026-09-24T09:00:00', '2026-09-24T10:00:00');
    const b = event('b', '2026-09-24T09:30:00', '2026-09-24T10:30:00');
    const c = event('c', '2026-09-24T10:00:00', '2026-09-24T11:00:00');
    const d = event('d', '2026-09-24T13:00:00', '2026-09-24T14:00:00');
    const placed = layoutDayEvents([d, c, b, a]);
    const byId = Object.fromEntries(placed.map((p) => [p.event.id, p]));
    expect(byId.a).toMatchObject({ column: 0, columns: 2 });
    expect(byId.b).toMatchObject({ column: 1, columns: 2 });
    // c starts when a ends, so it reuses a's column but stays in the overlap group with b.
    expect(byId.c).toMatchObject({ column: 0, columns: 2 });
    expect(byId.d).toMatchObject({ column: 0, columns: 1 });
  });
});
