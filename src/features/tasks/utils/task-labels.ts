import {
  isTaskOverdue,
  type Priority,
  type StatusColor,
  type Task,
  type TaskStatus,
  type TaskType,
} from '@/types/domain';

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const TASK_TYPES: TaskType[] = [
  'call',
  'meeting',
  'follow_up',
  'quote',
  'appointment',
  'payment',
  'general',
];

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  call: 'Call',
  meeting: 'Meeting',
  follow_up: 'Follow-up',
  quote: 'Quote',
  appointment: 'Appointment',
  payment: 'Payment',
  general: 'General',
};

export const TASK_TYPE_COLOR: Record<TaskType, StatusColor> = {
  call: 'info',
  meeting: 'highlight',
  follow_up: 'info',
  quote: 'warning',
  appointment: 'highlight',
  payment: 'destructive',
  general: 'neutral',
};

export const TASK_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TASK_STATUS_COLOR: Record<TaskStatus, StatusColor> = {
  pending: 'neutral',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'neutral',
};

/** Status pill text and colour, with "Overdue" derived from the due date. */
export function taskStatusBadge(
  task: Pick<Task, 'status' | 'dueAt'>,
  now = new Date(),
): { label: string; color: StatusColor } {
  if (isTaskOverdue(task, now)) return { label: 'Overdue', color: 'destructive' };
  return { label: TASK_STATUS_LABEL[task.status], color: TASK_STATUS_COLOR[task.status] };
}

export function isOpenTask(task: Pick<Task, 'status'>): boolean {
  return task.status === 'pending' || task.status === 'in_progress';
}
