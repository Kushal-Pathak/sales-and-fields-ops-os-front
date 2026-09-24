import type { BaseEntity } from './base';

export type ActivityEntityType = 'lead' | 'contact' | 'task' | 'quote' | 'appointment';

export type ActivityKind =
  | 'created'
  | 'stage_changed'
  | 'note'
  | 'task_created'
  | 'task_completed'
  | 'message'
  | 'quote_sent'
  | 'quote_status'
  | 'reassigned';

/** One line in an entity's timeline. `createdAt` is when it happened. */
export interface Activity extends BaseEntity {
  entityType: ActivityEntityType;
  entityId: string;
  kind: ActivityKind;
  message: string;
  /** The user who did it, or `null` for the system. */
  actorId: string | null;
}
