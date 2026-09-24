import type { ActivityKind, StatusColor } from '@/types/domain';

/** Dot colour per timeline entry kind. */
export const ACTIVITY_COLOR: Record<ActivityKind, StatusColor> = {
  created: 'neutral',
  stage_changed: 'success',
  note: 'info',
  task_created: 'highlight',
  task_completed: 'highlight',
  message: 'success',
  quote_sent: 'warning',
  quote_status: 'warning',
  appointment_scheduled: 'highlight',
  appointment_completed: 'highlight',
  appointment_cancelled: 'neutral',
  reassigned: 'info',
};
