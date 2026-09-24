import type { ActivityKind, AppointmentStatus, StatusColor } from '@/types/domain';

/**
 * Colours for rows the lead drawer shows read-only. When the Appointments feature
 * is built its map moves there and is imported here (as tasks and quotes already are).
 */

export const APPOINTMENT_STATUS_COLOR: Record<AppointmentStatus, StatusColor> = {
  scheduled: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

export const ACTIVITY_COLOR: Record<ActivityKind, StatusColor> = {
  created: 'neutral',
  stage_changed: 'success',
  note: 'info',
  task_created: 'highlight',
  task_completed: 'highlight',
  message: 'success',
  quote_sent: 'warning',
  quote_status: 'warning',
  reassigned: 'info',
};

/** `pending_approval` → "Pending approval". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
