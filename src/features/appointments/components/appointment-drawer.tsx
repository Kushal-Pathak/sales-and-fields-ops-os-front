import { useState, type FormEvent, type ReactNode } from 'react';
import {
  CalendarClockIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  SearchXIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import {
  addMinutes,
  formatDuration,
  formatTimeRange,
  fromDateTimeInputs,
  minutesBetween,
  toDateInput,
  toTimeInput,
} from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAppointment } from '../hooks/use-appointment';
import {
  useDeleteAppointment,
  useSetAppointmentStatus,
  useUpdateAppointment,
} from '../hooks/use-appointment-mutations';
import { DURATIONS } from '../utils/appointment-labels';
import type { AppointmentRow } from '../utils/appointment-view-model';
import { AppointmentStatusBadge, AppointmentTypeLabel } from './appointment-fields';
import { AppointmentFormDialog } from './appointment-form-dialog';
import { CompleteAppointmentDialog } from './complete-appointment-dialog';

interface AppointmentDrawerProps {
  appointmentId: string | null;
  onClose: () => void;
}

/** The appointment detail panel, opened by `?appointment=<id>`. */
export function AppointmentDrawer({ appointmentId, onClose }: AppointmentDrawerProps) {
  return (
    <DrawerPanel open={appointmentId !== null} onOpenChange={(open) => !open && onClose()}>
      {appointmentId !== null && (
        <AppointmentDrawerContent
          key={appointmentId}
          appointmentId={appointmentId}
          onClose={onClose}
        />
      )}
    </DrawerPanel>
  );
}

function AppointmentDrawerContent({
  appointmentId,
  onClose,
}: {
  appointmentId: string;
  onClose: () => void;
}) {
  const { row, isPending, notFound, error, refetch } = useAppointment(appointmentId);

  if (notFound) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Appointment not found</DrawerTitle>
          <DrawerDescription>The link may be stale.</DrawerDescription>
        </DrawerHeader>
        <EmptyState
          icon={SearchXIcon}
          title="This appointment no longer exists"
          hint="It may have been deleted."
          action={
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        />
      </>
    );
  }
  if (error) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Appointment</DrawerTitle>
          <DrawerDescription>Something went wrong.</DrawerDescription>
        </DrawerHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    );
  }
  if (isPending || !row) {
    return (
      <DrawerHeader className="gap-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-40" />
      </DrawerHeader>
    );
  }
  return <AppointmentDetails row={row} onClose={onClose} />;
}

function AppointmentDetails({ row, onClose }: { row: AppointmentRow; onClose: () => void }) {
  const { appointment, lead, contact, stage, assignee } = row;
  const locale = useWorkspace().data?.locale;
  const setStatus = useSetAppointmentStatus();
  const remove = useDeleteAppointment();
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scheduled = appointment.status === 'scheduled';
  const completed = appointment.status === 'completed';
  const cancelled = appointment.status === 'cancelled';

  return (
    <>
      <DrawerHeader className="gap-3">
        <div>
          <DrawerTitle className={cn(cancelled && 'text-muted-foreground line-through')}>
            {contact?.name ?? 'Appointment'}
          </DrawerTitle>
          <DrawerDescription>
            {formatDate(appointment.startAt, 'weekday', locale)} ·{' '}
            {formatTimeRange(appointment.startAt, appointment.endAt, locale)}
          </DrawerDescription>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <AppointmentTypeLabel type={appointment.type} className="text-xs" />
            <AppointmentStatusBadge appointment={appointment} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon /> Edit
          </Button>
          {scheduled && <ReschedulePopover appointment={appointment} />}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {scheduled && (
                <DropdownMenuItem
                  onClick={() => setStatus.mutate({ id: appointment.id, status: 'cancelled' })}
                >
                  <XIcon /> Cancel appointment
                </DropdownMenuItem>
              )}
              {cancelled && (
                <DropdownMenuItem
                  onClick={() => setStatus.mutate({ id: appointment.id, status: 'scheduled' })}
                >
                  <RotateCcwIcon /> Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <TrashIcon /> Delete appointment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Lead">
            {lead && (
              <Link to={`/leads?lead=${lead.id}`} className="block truncate hover:underline">
                {lead.title}
              </Link>
            )}
          </Field>
          <Field label="Stage">
            {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
          </Field>
          <Field label="Assignee">
            {assignee && (
              <span className="flex items-center gap-1.5">
                <InitialsAvatar size="sm" name={assignee.name} color={assignee.color} />
                {assignee.name}
              </span>
            )}
          </Field>
          <Field label="Duration">
            {formatDuration(minutesBetween(appointment.startAt, appointment.endAt))}
          </Field>
          <Field label="Location">{appointment.location}</Field>
          <Field label="Contact">
            {contact && (
              <span className="flex flex-col leading-tight">
                {contact.phone && <span>{contact.phone}</span>}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                    {contact.email}
                  </a>
                )}
              </span>
            )}
          </Field>
        </dl>

        <section>
          <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            {completed ? 'Outcome' : 'Notes'}
          </h3>
          {appointment.notes ? (
            <p className="text-sm whitespace-pre-wrap text-foreground-secondary">
              {appointment.notes}
            </p>
          ) : (
            <p className="text-sm text-foreground-faint">
              {completed ? 'No outcome recorded.' : 'No notes.'}
            </p>
          )}
        </section>
      </DrawerBody>

      <DrawerFooter className="justify-end">
        {setStatus.isError && (
          <span role="alert" className="mr-auto text-xs text-destructive">
            The change could not be saved.
          </span>
        )}
        {scheduled && (
          <Button size="sm" onClick={() => setCompleting(true)}>
            <CheckIcon /> Mark completed
          </Button>
        )}
        {completed && (
          <Button
            size="sm"
            variant="outline"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: appointment.id, status: 'scheduled' })}
          >
            <RotateCcwIcon /> Reopen
          </Button>
        )}
        {cancelled && (
          <Button
            size="sm"
            variant="outline"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: appointment.id, status: 'scheduled' })}
          >
            <RotateCcwIcon /> Restore
          </Button>
        )}
      </DrawerFooter>

      <AppointmentFormDialog open={editing} onOpenChange={setEditing} appointment={appointment} />
      <CompleteAppointmentDialog
        open={completing}
        onOpenChange={setCompleting}
        appointment={appointment}
      />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              The appointment with {contact?.name ?? 'this contact'} will be removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(appointment.id, {
                  onSuccess: () => {
                    setDeleting(false);
                    onClose();
                  },
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === undefined || children === null || children === false;
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">{label}</dt>
      <dd className={cn('mt-0.5 text-base', empty && 'text-foreground-faint')}>
        {empty ? '—' : children}
      </dd>
    </div>
  );
}

/** Pick a new date, time and duration without opening the whole form. */
function ReschedulePopover({ appointment }: { appointment: AppointmentRow['appointment'] }) {
  const update = useUpdateAppointment();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateInput(appointment.startAt));
  const [time, setTime] = useState(toTimeInput(appointment.startAt));
  const [duration, setDuration] = useState(
    String(minutesBetween(appointment.startAt, appointment.endAt)),
  );
  const durations = DURATIONS.some((d) => String(d.minutes) === duration)
    ? DURATIONS
    : [{ minutes: Number(duration), label: formatDuration(Number(duration)) }, ...DURATIONS];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const startAt = fromDateTimeInputs(date, time);
    if (!startAt) return;
    update.mutate(
      {
        id: appointment.id,
        patch: {
          startAt: startAt.toISOString(),
          endAt: addMinutes(startAt, Number(duration)).toISOString(),
        },
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClockIcon /> Reschedule
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-date">Date</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-time">Start time</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-duration">Duration</Label>
            <Select
              value={duration}
              onValueChange={(value) => value && setDuration(value)}
              items={durations.map((item) => ({ value: String(item.minutes), label: item.label }))}
            >
              <SelectTrigger id="reschedule-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durations.map((item) => (
                  <SelectItem key={item.minutes} value={String(item.minutes)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={update.isPending}>
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
