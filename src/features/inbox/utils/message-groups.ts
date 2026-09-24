import { addDays, dateKey, isSameDay } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import type { Message } from '@/types/domain';

export interface DayGroup {
  key: string;
  label: string;
  messages: Message[];
}

/** "Today", "Yesterday", or the weekday and date. */
export function dayLabel(date: Date, now = new Date(), locale = 'en-US'): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, addDays(now, -1))) return 'Yesterday';
  return formatDate(date.toISOString(), 'weekday', locale);
}

/** Messages in sent order, split by local day for the separators in a thread. */
export function groupByDay(messages: Message[], now = new Date(), locale = 'en-US'): DayGroup[] {
  const sorted = [...messages].sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  const groups: DayGroup[] = [];
  for (const message of sorted) {
    const date = new Date(message.sentAt);
    const key = dateKey(date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.messages.push(message);
    else groups.push({ key, label: dayLabel(date, now, locale), messages: [message] });
  }
  return groups;
}
