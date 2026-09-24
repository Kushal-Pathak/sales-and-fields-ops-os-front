import { StatusBadge } from '@/components/common/status-badge';
import { useWorkspace } from '@/features/workspace';
import { formatTimeRange } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isAppointmentOverdue, type Appointment, type AppointmentType } from '@/types/domain';
import {
  APPOINTMENT_TYPE_ICON,
  APPOINTMENT_TYPE_LABEL,
  appointmentStatusBadge,
} from '../utils/appointment-labels';

/** Small presentational pieces shared by the table, drawer, lead drawer and calendar. */

export function AppointmentTypeLabel({
  type,
  className,
}: {
  type: AppointmentType;
  className?: string | undefined;
}) {
  const Icon = APPOINTMENT_TYPE_ICON[type];
  return (
    <span className={cn('flex items-center gap-1.5 text-foreground-secondary', className)}>
      <Icon className="size-3.5 shrink-0" />
      {APPOINTMENT_TYPE_LABEL[type]}
    </span>
  );
}

export function AppointmentStatusBadge({
  appointment,
}: {
  appointment: Pick<Appointment, 'status' | 'endAt'>;
}) {
  const { label, color } = appointmentStatusBadge(appointment);
  return <StatusBadge color={color}>{label}</StatusBadge>;
}

/** Date on one line and the time range under it; red while an outcome is missing. */
export function AppointmentWhen({
  appointment,
  className,
}: {
  appointment: Pick<Appointment, 'status' | 'startAt' | 'endAt'>;
  className?: string | undefined;
}) {
  const locale = useWorkspace().data?.locale;
  const overdue = isAppointmentOverdue(appointment);
  return (
    <span className={cn('flex flex-col leading-tight', className)}>
      <span className={cn(overdue && 'font-semibold text-destructive')}>
        {formatDate(appointment.startAt, 'weekday', locale)}
      </span>
      <span className="text-xs text-foreground-faint tabular-nums">
        {formatTimeRange(appointment.startAt, appointment.endAt, locale)}
      </span>
    </span>
  );
}
