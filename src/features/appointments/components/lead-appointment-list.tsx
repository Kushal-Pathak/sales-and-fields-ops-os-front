import { useState } from 'react';
import { CalendarIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { formatTimeRange } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isAppointmentOverdue } from '@/types/domain';
import { useAppointments } from '../hooks/use-appointments';
import { APPOINTMENT_TYPE_LABEL } from '../utils/appointment-labels';
import { AppointmentStatusBadge } from './appointment-fields';
import { AppointmentFormDialog } from './appointment-form-dialog';

/**
 * A lead's appointments inside the lead drawer: open one in the appointments
 * workspace, or schedule a new one with the lead preselected.
 */
export function LeadAppointmentList({ leadId }: { leadId: string }) {
  const appointments = useAppointments();
  const locale = useWorkspace().data?.locale;
  const [scheduling, setScheduling] = useState(false);

  const rows = (appointments.rows ?? [])
    .filter((row) => row.appointment.leadId === leadId)
    .sort((a, b) => b.appointment.startAt.localeCompare(a.appointment.startAt));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setScheduling(true)}>
          <PlusIcon /> Schedule
        </Button>
      </div>

      {appointments.isPending ? (
        <ul className="flex flex-col">
          {Array.from({ length: 2 }, (_, index) => (
            <li key={index} className="border-b border-border-faint py-2.5 last:border-0">
              <Skeleton className="h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarIcon}
          title="No appointments for this lead"
          hint="Schedule a meeting, call or visit."
          className="p-2 pt-4"
        />
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ appointment, assignee }) => {
            const overdue = isAppointmentOverdue(appointment);
            const done = appointment.status !== 'scheduled';
            return (
              <li
                key={appointment.id}
                className="flex items-center gap-3 border-b border-border-faint py-2 last:border-0"
              >
                <Link
                  to={`/appointments?view=all&appointment=${appointment.id}`}
                  className={cn('min-w-0 flex-1 hover:underline', done && 'text-muted-foreground')}
                >
                  <span
                    className={cn(
                      'block truncate text-sm font-medium',
                      overdue && 'text-destructive',
                    )}
                  >
                    {formatDate(appointment.startAt, 'weekday', locale)} ·{' '}
                    {formatTimeRange(appointment.startAt, appointment.endAt, locale)}
                  </span>
                  <span className="block truncate text-xs text-foreground-faint">
                    {APPOINTMENT_TYPE_LABEL[appointment.type]}
                    {appointment.location ? ` · ${appointment.location}` : ''} ·{' '}
                    {assignee?.name ?? 'Unassigned'}
                  </span>
                </Link>
                <AppointmentStatusBadge appointment={appointment} />
              </li>
            );
          })}
        </ul>
      )}

      <AppointmentFormDialog
        open={scheduling}
        onOpenChange={setScheduling}
        defaultLeadId={leadId}
      />
    </div>
  );
}
