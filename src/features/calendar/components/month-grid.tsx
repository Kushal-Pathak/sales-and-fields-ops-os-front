import { PlusIcon } from 'lucide-react';
import { useWorkspace } from '@/features/workspace';
import { dateKey, isSameDay } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { groupByDay, monthCells, weekDays, type CalendarEvent } from '../utils/calendar-model';
import { EventChip } from './event-chip';

interface MonthGridProps {
  date: Date;
  events: CalendarEvent[];
  onOpenEvent: (event: CalendarEvent) => void;
  /** A day's empty area was clicked; `startAt` is 9:00 that day. */
  onSlotClick: (startAt: Date) => void;
  /** "+n more" was clicked: show that day's week. */
  onShowDay: (day: Date) => void;
}

const VISIBLE_PER_DAY = 3;

/** Six-week month grid with up to three one-line chips per day and a "+n more" link. */
export function MonthGrid({ date, events, onOpenEvent, onSlotClick, onShowDay }: MonthGridProps) {
  const locale = useWorkspace().data?.locale;
  const now = new Date();
  const cells = monthCells(date);
  const byDay = groupByDay(events);
  const headers = weekDays(date).map((day) =>
    formatDate(day.toISOString(), 'weekdayShort', locale),
  );

  return (
    <div className="flex min-w-[700px] flex-col">
      <div className="sticky top-0 z-20 grid grid-cols-7 border-b bg-background">
        {headers.map((label) => (
          <div key={label} className="py-1.5 text-center text-xs text-foreground-faint">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-[minmax(6.5rem,1fr)]">
        {cells.map(({ date: day, inMonth }) => {
          const today = isSameDay(day, now);
          const dayEvents = byDay.get(dateKey(day)) ?? [];
          const hidden = dayEvents.length - VISIBLE_PER_DAY;
          const slot = new Date(day);
          slot.setHours(9, 0, 0, 0);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onSlotClick(slot)}
              className={cn(
                'group flex cursor-pointer flex-col gap-0.5 border-b border-l p-1 hover:bg-muted/40 [&:nth-child(7n+1)]:border-l-0',
                !inMonth && 'bg-surface-2/40 text-foreground-faint',
                today && 'bg-accent/40',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                    today && 'bg-primary text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  aria-label={`Schedule on ${formatDate(day.toISOString(), 'date', locale)}`}
                  onClick={(click) => {
                    click.stopPropagation();
                    onSlotClick(slot);
                  }}
                  className="flex size-5 items-center justify-center rounded-md text-foreground-faint opacity-0 hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <PlusIcon className="size-3.5" />
                </button>
              </div>
              {dayEvents.slice(0, VISIBLE_PER_DAY).map((event) => (
                <EventChip key={event.id} event={event} layout="line" onOpen={onOpenEvent} />
              ))}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={(click) => {
                    click.stopPropagation();
                    onShowDay(day);
                  }}
                  className="self-start px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                >
                  +{hidden} more
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
