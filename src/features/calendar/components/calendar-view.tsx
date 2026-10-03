import { QueryContent } from '@/components/common/query-content';
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
  /** Omit when the user cannot schedule appointments; empty slots are then not clickable. */
  onSlotClick?: ((startAt: Date) => void) | undefined;
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
  if (isPending || !events) {
    return (
      <QueryContent
        error={error}
        hasData={events !== undefined}
        title="Calendar could not be loaded"
        onRetry={onRetry}
      >
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </QueryContent>
    );
  }
  return (
    <QueryContent
      error={error}
      hasData={events !== undefined}
      title="Calendar could not be loaded"
      onRetry={onRetry}
    >
      {filters.view === 'week' ? (
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
      )}
    </QueryContent>
  );
}
