/**
 * Formatting helpers built on `Intl`. Pass the workspace's `currency` / `locale`
 * so every screen formats the same way.
 */

export interface MoneyOptions {
  currency: string;
  locale?: string;
  /** Drop cents for round amounts (default true). */
  compact?: boolean;
}

export function formatMoney(
  amount: number,
  { currency, locale = 'en-US', compact = true }: MoneyOptions,
): string {
  const whole = compact && Number.isInteger(amount);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

export type DateStyle = 'date' | 'datetime' | 'time' | 'monthDay';

const DATE_FORMATS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  datetime: { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
  time: { hour: 'numeric', minute: '2-digit' },
  monthDay: { day: 'numeric', month: 'short' },
};

export function formatDate(iso: string, style: DateStyle = 'date', locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMATS[style]).format(new Date(iso));
}

const RELATIVE_UNITS: [unit: Intl.RelativeTimeFormatUnit, ms: number][] = [
  ['year', 365 * 86_400_000],
  ['month', 30 * 86_400_000],
  ['week', 7 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

/** "2 hours ago", "in 3 days", or "just now" within 45 seconds. */
export function formatRelative(iso: string, now: Date = new Date(), locale = 'en-US'): string {
  const diff = new Date(iso).getTime() - now.getTime();
  if (Math.abs(diff) < 45_000) return 'just now';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return formatter.format(Math.round(diff / 60_000), 'minute');
}

/** Up to two initials from a display name: "Priya Raman" → "PR". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase() || '?';
}
