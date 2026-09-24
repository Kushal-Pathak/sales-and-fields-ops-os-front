import { describe, expect, it } from 'vitest';
import {
  addMonths,
  dateKey,
  formatDuration,
  fromDateTimeInputs,
  minutesBetween,
  parseDateKey,
  startOfWeek,
  toDateInput,
  toTimeInput,
} from './dates';

describe('dates', () => {
  it('starts the week on Monday by default and on Sunday when asked', () => {
    const wednesday = new Date('2026-09-23T15:30:00');
    expect(dateKey(startOfWeek(wednesday))).toBe('2026-09-21');
    expect(dateKey(startOfWeek(wednesday, 0))).toBe('2026-09-20');
    const sunday = new Date('2026-09-27T09:00:00');
    expect(dateKey(startOfWeek(sunday))).toBe('2026-09-21');
    const monday = new Date('2026-09-21T00:00:00');
    expect(dateKey(startOfWeek(monday))).toBe('2026-09-21');
  });

  it('round-trips date keys and rejects bad ones', () => {
    expect(parseDateKey('2026-02-28')?.getDate()).toBe(28);
    expect(parseDateKey('2026-02-30')).toBeNull();
    expect(parseDateKey('nope')).toBeNull();
    expect(parseDateKey(null)).toBeNull();
    expect(dateKey(parseDateKey('2026-12-31')!)).toBe('2026-12-31');
  });

  it('moves whole months without overflowing', () => {
    expect(dateKey(addMonths(new Date('2026-01-31T10:00:00'), 1))).toBe('2026-02-01');
    expect(dateKey(addMonths(new Date('2026-12-15T10:00:00'), 1))).toBe('2027-01-01');
  });

  it('converts to and from date/time inputs in local time', () => {
    const iso = new Date('2026-09-24T14:05:00').toISOString();
    expect(toDateInput(iso)).toBe('2026-09-24');
    expect(toTimeInput(iso)).toBe('14:05');
    expect(toTimeInput(undefined)).toBe('09:00');
    expect(fromDateTimeInputs('2026-09-24', '14:05')?.toISOString()).toBe(iso);
    expect(fromDateTimeInputs('', '14:05')).toBeNull();
    expect(fromDateTimeInputs('2026-13-40', '14:05')).toBeNull();
  });

  it('measures and formats durations', () => {
    expect(minutesBetween('2026-09-24T10:00:00Z', '2026-09-24T11:30:00Z')).toBe(90);
    expect(formatDuration(30)).toBe('30 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(150)).toBe('2 h 30 min');
  });
});
