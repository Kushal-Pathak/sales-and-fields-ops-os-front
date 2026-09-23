import type { BaseEntity } from '@/types/domain';

/** Date helpers anchored to a fixed `now`, so a seed is consistent within itself. */
export interface Clock {
  now: Date;
  /** `daysFromNow(-2)` = two days ago; optional `hour` sets the local time of day. */
  daysFromNow(days: number, hour?: number, minute?: number): string;
  hoursFromNow(hours: number): string;
  /** `createdAt` / `updatedAt` for a row created `daysAgo` days ago. */
  stamp(daysAgo: number, updatedDaysAgo?: number): Pick<BaseEntity, 'createdAt' | 'updatedAt'>;
}

export function createClock(now: Date): Clock {
  const daysFromNow = (days: number, hour?: number, minute = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    if (hour !== undefined) date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  };
  return {
    now,
    daysFromNow,
    hoursFromNow: (hours) => new Date(now.getTime() + hours * 3_600_000).toISOString(),
    stamp: (daysAgo, updatedDaysAgo = daysAgo) => ({
      createdAt: daysFromNow(-daysAgo),
      updatedAt: daysFromNow(-updatedDaysAgo),
    }),
  };
}

/** Picks an element by index, throwing at seed time if a reference is out of range. */
export function at<T>(rows: readonly T[], index: number, what: string): T {
  const row = rows[index];
  if (row === undefined) throw new Error(`Seed: ${what}[${index}] does not exist`);
  return row;
}
