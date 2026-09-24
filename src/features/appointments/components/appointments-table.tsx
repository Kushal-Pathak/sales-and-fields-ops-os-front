import { CalendarIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { AppointmentRow } from '../utils/appointment-view-model';
import {
  AppointmentStatusBadge,
  AppointmentTypeLabel,
  AppointmentWhen,
} from './appointment-fields';

interface AppointmentsTableProps {
  rows: AppointmentRow[] | undefined;
  isPending: boolean;
  error: unknown;
  isFiltered: boolean;
  onOpen: (appointmentId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

const COLUMNS = [
  { label: 'When', className: 'w-[200px]' },
  { label: 'Type', className: 'w-[140px]' },
  { label: 'Customer', className: 'w-[180px]' },
  { label: 'Lead', className: 'w-[280px]' },
  { label: 'Location', className: 'w-[220px]' },
  { label: 'Assignee', className: 'w-[160px]' },
  { label: 'Status', className: '' },
] as const;

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** The appointments table. Rows open the drawer; the trailing row schedules a new one. */
export function AppointmentsTable({
  rows,
  isPending,
  error,
  isFiltered,
  onOpen,
  onCreate,
  onClearFilters,
  onRetry,
}: AppointmentsTableProps) {
  if (error)
    return <ErrorState title="Appointments could not be loaded" error={error} onRetry={onRetry} />;

  if (!isPending && rows && rows.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={CalendarIcon}
        title="No appointments match"
        hint="Try another view, search or filter."
        action={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={CalendarIcon}
        title="Nothing scheduled"
        hint="Book a meeting, call or visit with a lead."
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> Schedule appointment
          </Button>
        }
      />
    );
  }

  return (
    <Table containerClassName="overflow-visible" className="min-w-[1200px]">
      <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
        <TableRow className="border-border hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={cn(HEAD_CLASS, column.className)}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending || !rows
          ? Array.from({ length: 8 }, (_, index) => (
              <TableRow key={index} className="border-border-faint hover:bg-transparent">
                {COLUMNS.map((column) => (
                  <TableCell key={column.label} className={CELL_CLASS}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : rows.map((row) => (
              <AppointmentTableRow key={row.appointment.id} row={row} onOpen={onOpen} />
            ))}
        {!isPending && (
          <TableRow className="border-0 hover:bg-muted">
            <TableCell colSpan={COLUMNS.length} className="p-0">
              <button
                type="button"
                onClick={onCreate}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
              >
                <PlusIcon className="size-3.5" /> Schedule appointment
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function AppointmentTableRow({
  row,
  onOpen,
}: {
  row: AppointmentRow;
  onOpen: (appointmentId: string) => void;
}) {
  const { appointment, lead, contact, stage, assignee } = row;
  const done = appointment.status !== 'scheduled';
  const open = () => onOpen(appointment.id);

  return (
    <TableRow
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          open();
        }
      }}
      aria-label={`Open appointment with ${contact?.name ?? 'unknown contact'}`}
      className={cn(
        'cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        done && 'text-muted-foreground',
      )}
    >
      <TableCell className={CELL_CLASS}>
        <AppointmentWhen appointment={appointment} />
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <AppointmentTypeLabel type={appointment.type} />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[180px] truncate font-semibold')}>
        {contact?.name ?? '—'}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[280px]')}>
        {lead ? (
          <span className="flex items-center gap-2">
            <span className="truncate">{lead.title}</span>
            {stage && (
              <StatusBadge color={stage.color} className="shrink-0">
                {stage.name}
              </StatusBadge>
            )}
          </span>
        ) : (
          <span className="text-foreground-faint">—</span>
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[220px] truncate text-foreground-secondary')}>
        {appointment.location ?? '—'}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {assignee ? (
          <span className="flex items-center gap-1.5">
            <InitialsAvatar size="sm" name={assignee.name} color={assignee.color} />
            <span className="truncate">{assignee.name}</span>
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <AppointmentStatusBadge appointment={appointment} />
      </TableCell>
    </TableRow>
  );
}
