import { useNow } from '@/hooks/use-now';
import { useWorkspace } from '@/features/workspace';
import { isSameDay } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  eventsForDay,
  hourRange,
  layoutDayEvents,
  weekDays,
  type CalendarEvent,
} from '../utils/calendar-model';
import { EventChip } from './event-chip';

interface WeekGridProps {
  date: Date;
  events: CalendarEvent[];
  onOpenEvent: (event: CalendarEvent) => void;
  /** An empty hour cell was clicked; `startAt` is that hour on that day. Omit when nothing can be scheduled. */
  onSlotClick?: ((startAt: Date) => void) | undefined;
}

const HOUR_PX = 56;
const MIN_BLOCK_PX = 22;
const COLUMNS = 'grid-cols-[56px_repeat(7,minmax(0,1fr))]';

/** Mon–Sun time grid: hour rows, one column per day, events placed by time and overlap. */
export function WeekGrid({ date, events, onOpenEvent, onSlotClick }: WeekGridProps) {
  const locale = useWorkspace().data?.locale;
  const now = useNow();
  const days = weekDays(date);
  const byDay = days.map((day) => eventsForDay(events, day));
  const { startHour, endHour } = hourRange(byDay.flat());
  const hours = Array.from({ length: endHour - startHour }, (_, index) => startHour + index);
  const hourLabel = (hour: number) =>
    new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(new Date(2000, 0, 1, hour));
  const minutesFromTop = (value: Date) =>
    value.getHours() * 60 + value.getMinutes() - startHour * 60;
  const nowOffset = (minutesFromTop(now) / 60) * HOUR_PX;

  return (
    <div className="min-w-[760px]">
      <div className={cn('sticky top-0 z-20 grid border-b bg-background', COLUMNS)}>
        <div />
        {days.map((day) => {
          const today = isSameDay(day, now);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex flex-col items-center border-l py-2 leading-tight',
                today && 'bg-accent/60',
              )}
            >
              <span className={cn('text-xs', today ? 'font-semibold' : 'text-foreground-faint')}>
                {formatDate(day.toISOString(), 'weekdayShort', locale)}
              </span>
              <span className={cn('text-lg font-bold', !today && 'text-foreground-secondary')}>
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      <div className={cn('grid', COLUMNS)}>
        <div className="relative" style={{ height: hours.length * HOUR_PX }}>
          {hours.map((hour, index) => (
            <span
              key={hour}
              className="absolute right-2 -translate-y-1/2 text-2xs text-foreground-faint tabular-nums"
              style={{ top: index * HOUR_PX }}
            >
              {index > 0 && hourLabel(hour)}
            </span>
          ))}
        </div>
        {days.map((day, dayIndex) => {
          const today = isSameDay(day, now);
          const placed = layoutDayEvents(byDay[dayIndex] ?? []);
          return (
            <div
              key={day.toISOString()}
              className={cn('relative border-l', today && 'bg-accent/30')}
              style={{ height: hours.length * HOUR_PX }}
            >
              {hours.map((hour) => {
                const slot = new Date(day);
                slot.setHours(hour, 0, 0, 0);
                return onSlotClick ? (
                  <button
                    key={hour}
                    type="button"
                    aria-label={`Schedule on ${formatDate(slot.toISOString(), 'datetime', locale)}`}
                    onClick={() => onSlotClick(slot)}
                    className="block h-14 w-full cursor-pointer border-t border-border-faint hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
                  />
                ) : (
                  <div key={hour} className="h-14 border-t border-border-faint" />
                );
              })}
              {placed.map(({ event, column, columns }) => {
                const start = new Date(event.startAt);
                const end = new Date(event.endAt);
                const top = Math.max(0, (minutesFromTop(start) / 60) * HOUR_PX);
                const height = Math.max(
                  MIN_BLOCK_PX,
                  ((end.getTime() - start.getTime()) / 3_600_000) * HOUR_PX - 2,
                );
                const width = 100 / columns;
                return (
                  <EventChip
                    key={event.id}
                    event={event}
                    layout="block"
                    onOpen={onOpenEvent}
                    className="z-10"
                    style={{
                      top: top + 1,
                      height,
                      left: `calc(${column * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                    }}
                  />
                );
              })}
              {today && nowOffset >= 0 && nowOffset <= hours.length * HOUR_PX && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute right-0 left-0 z-10 border-t-2 border-destructive"
                  style={{ top: nowOffset }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
