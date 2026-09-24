import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { FilterChip } from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toggle } from '@/components/ui/toggle';
import { useUsers, useWorkspace } from '@/features/workspace';
import { addDays } from '@/lib/dates';
import { cn } from '@/lib/utils';
import {
  CALENDAR_VIEW_LABEL,
  CALENDAR_VIEWS,
  type CalendarFilters,
  type CalendarView,
} from '../utils/calendar-filters';
import { weekDays } from '../utils/calendar-model';

interface CalendarToolbarProps {
  filters: CalendarFilters;
  onChange: (patch: Partial<CalendarFilters>) => void;
  onShift: (delta: number) => void;
  onToday: () => void;
}

/** ‹ › Today, the visible range, the week/month switch, and the assignee and tasks filters. */
export function CalendarToolbar({ filters, onChange, onShift, onToday }: CalendarToolbarProps) {
  const locale = useWorkspace().data?.locale ?? 'en-US';
  const users = (useUsers().data ?? []).filter((user) => user.active);
  const unit = filters.view === 'week' ? 'week' : 'month';

  const title =
    filters.view === 'week'
      ? new Intl.DateTimeFormat(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).formatRange(weekDays(filters.date)[0]!, addDays(weekDays(filters.date)[6]!, 0))
      : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(filters.date);

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Previous ${unit}`}
          onClick={() => onShift(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={`Next ${unit}`}
          onClick={() => onShift(1)}
        >
          <ChevronRightIcon />
        </Button>
        <Button variant="outline" size="sm" className="ml-1" onClick={onToday}>
          Today
        </Button>
      </div>
      <h2 className="ml-1 text-sm font-semibold" aria-live="polite">
        {title}
      </h2>

      <Tabs
        value={filters.view}
        onValueChange={(view) => onChange({ view: view as CalendarView })}
        className="ml-auto"
      >
        <TabsList className="h-auto gap-0.5 bg-transparent p-0">
          {CALENDAR_VIEWS.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="h-7 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              {CALENDAR_VIEW_LABEL[view]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <FilterChip
        label="Assignee"
        value={filters.assigneeId}
        anyLabel="anyone"
        items={users.map((user) => ({ value: user.id, label: user.name }))}
        onChange={(assigneeId) => onChange({ assigneeId })}
      />
      <Toggle
        size="sm"
        aria-label="Show tasks"
        pressed={filters.showTasks}
        onPressedChange={(showTasks) => onChange({ showTasks })}
        className={cn(
          'h-6 gap-1 rounded-full bg-surface-2 px-2.5 text-xs text-muted-foreground',
          filters.showTasks && 'bg-accent text-foreground',
        )}
      >
        {filters.showTasks && <CheckIcon className="size-3" />}
        Tasks
      </Toggle>
    </div>
  );
}
