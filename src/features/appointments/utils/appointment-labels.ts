import { MapPinIcon, PhoneIcon, UsersIcon, VideoIcon, type LucideIcon } from 'lucide-react';
import {
  isAppointmentOverdue,
  type Appointment,
  type AppointmentStatus,
  type AppointmentType,
  type StatusColor,
} from '@/types/domain';

export const APPOINTMENT_TYPES: AppointmentType[] = [
  'meeting',
  'video_call',
  'phone_call',
  'on_site',
];

export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  meeting: 'Meeting',
  video_call: 'Video call',
  phone_call: 'Phone call',
  on_site: 'On-site visit',
};

export const APPOINTMENT_TYPE_ICON: Record<AppointmentType, LucideIcon> = {
  meeting: UsersIcon,
  video_call: VideoIcon,
  phone_call: PhoneIcon,
  on_site: MapPinIcon,
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = ['scheduled', 'completed', 'cancelled'];

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, StatusColor> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

/** The pill text and colour, with "Needs outcome" for scheduled appointments that already ended. */
export function appointmentStatusBadge(
  appointment: Pick<Appointment, 'status' | 'endAt'>,
  now = new Date(),
): { label: string; color: StatusColor } {
  if (isAppointmentOverdue(appointment, now)) return { label: 'Needs outcome', color: 'warning' };
  return {
    label: APPOINTMENT_STATUS_LABEL[appointment.status],
    color: APPOINTMENT_STATUS_COLOR[appointment.status],
  };
}

/** Duration choices for the scheduling form, in minutes. */
export const DURATIONS: { minutes: number; label: string }[] = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1.5 hours' },
  { minutes: 120, label: '2 hours' },
  { minutes: 180, label: '3 hours' },
  { minutes: 240, label: '4 hours' },
];

export const DEFAULT_DURATION = 60;
