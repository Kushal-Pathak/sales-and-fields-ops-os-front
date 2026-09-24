import { ErrorState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarFilters } from '../utils/calendar-filters';
import type { CalendarEvent } from '../utils/calendar-model';
import { MonthGrid } from './month-grid';
import { WeekGrid } from './week-grid';

interface CalendarViewProps {
  filters: CalendarFilters;
  events: CalendarEvent[] | undefined;
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  onOpenEvent: (event: CalendarEvent) => void;
  onSlotClick: (startAt: Date) => void;
  onShowDay: (day: Date) => void;
}

/** The grid for the current view, with loading and error states. */
export function CalendarView({
  filters,
  events,
  isPending,
  error,
  onRetry,
  onOpenEvent,
  onSlotClick,
  onShowDay,
}: CalendarViewProps) {
  if (error)
    return <ErrorState title="Calendar could not be loaded" error={error} onRetry={onRetry} />;
  if (isPending || !events) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return filters.view === 'week' ? (
    <WeekGrid
      date={filters.date}
      events={events}
      onOpenEvent={onOpenEvent}
      onSlotClick={onSlotClick}
    />
  ) : (
    <MonthGrid
      date={filters.date}
      events={events}
      onOpenEvent={onOpenEvent}
      onSlotClick={onSlotClick}
      onShowDay={onShowDay}
    />
  );
}
