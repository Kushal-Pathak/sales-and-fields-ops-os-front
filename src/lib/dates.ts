/**
 * Local-time date arithmetic and `<input type="date|time">` conversions. Everything
 * here works in the browser's time zone, which is what the calendar and the
 * scheduling forms show. No domain knowledge, no React.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday by default (`weekStartsOn` uses `Date#getDay` numbering, 0 = Sunday). */
export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const day = startOfDay(date);
  const diff = (day.getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -diff);
}

export function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

/** `YYYY-MM-DD` in local time; the key used by day buckets and `?date=`. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a `YYYY-MM-DD` key as local midnight; `null` when malformed. */
export function parseDateKey(key: string | null | undefined): Date | null {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime()) || dateKey(date) !== key ? null : date;
}

export function toDateInput(iso: string | undefined): string {
  return iso ? dateKey(new Date(iso)) : '';
}

export function toTimeInput(iso: string | undefined, fallback = '09:00'): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Combines the two inputs into a local `Date`; `null` when either is unusable. */
export function fromDateTimeInputs(date: string, time: string): Date | null {
  if (!date) return null;
  const value = new Date(`${date}T${time || '09:00'}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

/** "2 h 30 min", "45 min", "1 h". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** "10:00 – 11:30 AM" style range using the locale's time format. */
export function formatTimeRange(startIso: string, endIso: string, locale = 'en-US'): string {
  const format = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  return format.formatRange(new Date(startIso), new Date(endIso));
}
