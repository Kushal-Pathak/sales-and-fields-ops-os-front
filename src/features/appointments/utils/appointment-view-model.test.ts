import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { isAppointmentOverdue } from '@/types/domain';
import { DEFAULT_APPOINTMENT_FILTERS } from './appointment-filters';
import {
  filterAppointments,
  joinAppointments,
  sortAppointments,
  viewCounts,
} from './appointment-view-model';

const now = new Date();
const seed = buildSeed(now);
const rows = joinAppointments(seed.appointments, seed);

describe('appointment view model', () => {
  it('joins the lead, contact, stage and assignee', () => {
    for (const row of rows) {
      expect(row.lead?.id).toBe(row.appointment.leadId);
      expect(row.contact?.id).toBe(row.appointment.contactId);
      expect(row.stage?.id).toBe(row.lead?.stageId);
      expect(row.assignee?.id).toBe(row.appointment.assigneeId);
    }
  });

  it('counts the views from the seed', () => {
    const counts = viewCounts(rows, now);
    expect(counts.all).toBe(rows.length);
    expect(counts.overdue).toBe(
      rows.filter((row) => isAppointmentOverdue(row.appointment, now)).length,
    );
    expect(counts.overdue).toBeGreaterThan(0);
    expect(counts.today).toBeGreaterThan(0);
    expect(counts.cancelled).toBe(1);
    expect(counts.upcoming + counts.overdue + counts.completed + counts.cancelled).toBe(counts.all);
  });

  it('filters by view, search, assignee and type', () => {
    const upcoming = filterAppointments(rows, DEFAULT_APPOINTMENT_FILTERS, now);
    expect(
      upcoming.every(
        (row) => row.appointment.status === 'scheduled' && new Date(row.appointment.endAt) >= now,
      ),
    ).toBe(true);

    const boston = filterAppointments(rows, {
      ...DEFAULT_APPOINTMENT_FILTERS,
      view: 'all',
      q: 'boston',
    });
    expect(boston.length).toBeGreaterThan(0);
    expect(boston.every((row) => row.appointment.location?.includes('Boston'))).toBe(true);

    const calls = filterAppointments(rows, {
      ...DEFAULT_APPOINTMENT_FILTERS,
      view: 'all',
      type: 'video_call',
    });
    expect(calls.every((row) => row.appointment.type === 'video_call')).toBe(true);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('sorts by start and by created', () => {
    const byStart = sortAppointments(rows, { key: 'start', direction: 'asc' });
    for (let i = 1; i < byStart.length; i += 1) {
      expect(byStart[i - 1]!.appointment.startAt <= byStart[i]!.appointment.startAt).toBe(true);
    }
    const newest = sortAppointments(rows, { key: 'created', direction: 'desc' });
    for (let i = 1; i < newest.length; i += 1) {
      expect(newest[i - 1]!.appointment.createdAt >= newest[i]!.appointment.createdAt).toBe(true);
    }
  });
});
