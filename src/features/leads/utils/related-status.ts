import type { ActivityKind, AppointmentStatus, QuoteStatus, StatusColor } from '@/types/domain';

/**
 * Colours for rows the lead drawer shows read-only. When the Tasks, Quotes and
 * Appointments features are built these maps move to them and are imported here.
 */

export const QUOTE_STATUS_COLOR: Record<QuoteStatus, StatusColor> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'destructive',
  sent: 'info',
  accepted: 'success',
  declined: 'destructive',
};

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
