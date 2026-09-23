import type { BaseEntity, Priority } from './base';

export type TaskType =
  'call' | 'meeting' | 'follow_up' | 'quote' | 'appointment' | 'payment' | 'general';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

/**
 * A unit of work, usually attached to a lead.
 * "Overdue" is not stored: it is `status` pending/in_progress with `dueAt` in the past.
 */
export interface Task extends BaseEntity {
  title: string;
  description?: string;
  leadId?: string;
  contactId?: string;
  assigneeId: string;
  dueAt: string;
  type: TaskType;
  priority: Priority;
  status: TaskStatus;
  completedAt?: string;
}

export function isTaskOverdue(task: Pick<Task, 'status' | 'dueAt'>, now = new Date()): boolean {
  return (
    (task.status === 'pending' || task.status === 'in_progress') &&
    new Date(task.dueAt).getTime() < now.getTime()
  );
}
