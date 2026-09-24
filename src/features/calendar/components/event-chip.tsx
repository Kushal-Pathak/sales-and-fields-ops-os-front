import type { CSSProperties } from 'react';
import { STATUS_COLOR_CLASSES } from '@/components/common/status-color';
import { APPOINTMENT_TYPE_ICON } from '@/features/appointments';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '../utils/calendar-model';

interface EventChipProps {
  event: CalendarEvent;
  /** `block` fills its slot in the week grid; `line` is the one-line month version. */
  layout: 'block' | 'line';
  style?: CSSProperties | undefined;
  className?: string | undefined;
  onOpen: (event: CalendarEvent) => void;
}

/** One event on the grid: a button coloured by its category, faded once done. */
export function EventChip({ event, layout, style, className, onOpen }: EventChipProps) {
  const locale = useWorkspace().data?.locale;
  const Icon = event.appointmentType ? APPOINTMENT_TYPE_ICON[event.appointmentType] : null;
  const kind = event.kind === 'appointment' ? 'appointment' : 'task';

  return (
    <button
      type="button"
      style={style}
      aria-label={`Open ${kind} ${event.title}`}
      onClick={(click) => {
        click.stopPropagation();
        onOpen(event);
      }}
      className={cn(
        'flex min-w-0 cursor-pointer overflow-hidden rounded-md border-l-2 text-left text-xs leading-tight transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        STATUS_COLOR_CLASSES[event.color].chip,
        event.muted && 'opacity-50',
        layout === 'block'
          ? 'absolute flex-col gap-0.5 px-1.5 py-1'
          : 'w-full items-center gap-1 px-1.5 py-0.5',
        className,
      )}
    >
      {layout === 'line' && (
        <span className="shrink-0 tabular-nums opacity-75">
          {formatDate(event.startAt, 'time', locale)}
        </span>
      )}
      <span className="flex min-w-0 items-center gap-1 font-semibold">
        {Icon && <Icon className="size-3 shrink-0" />}
        <span className="truncate">{event.title}</span>
      </span>
      {layout === 'block' && <span className="truncate opacity-75">{event.subtitle}</span>}
    </button>
  );
}
