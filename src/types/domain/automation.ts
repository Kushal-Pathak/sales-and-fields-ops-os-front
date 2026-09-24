import type { BaseEntity, Priority } from './base';
import type { Channel } from './conversation';
import type { QuoteStatus } from './quote';
import type { TaskType } from './task';

/** What starts a rule. `null` parameters mean "any". */
export type AutomationTrigger =
  | { type: 'lead_created'; source: string | null }
  | { type: 'lead_stage_changed'; stageId: string | null }
  | { type: 'quote_status_changed'; status: QuoteStatus }
  | { type: 'appointment_completed' };

export type AutomationTriggerType = AutomationTrigger['type'];

/** What a rule does to the lead the event belongs to. */
export type AutomationAction =
  | {
      type: 'create_task';
      title: string;
      taskType: TaskType;
      /** The lead's owner, or a user id. */
      assignee: 'owner' | string;
      dueInDays: number;
      priority: Priority;
    }
  | { type: 'move_stage'; stageId: string }
  | { type: 'assign_owner'; userId: string }
  | { type: 'send_message'; channel: Channel; quickReplyId: string }
  | { type: 'add_note'; text: string };

export type AutomationActionType = AutomationAction['type'];

export interface Automation extends BaseEntity {
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  active: boolean;
  createdById: string;
  lastRunAt?: string;
  runCount: number;
}

/** One execution of a rule for one lead. */
export interface AutomationRun extends BaseEntity {
  automationId: string;
  leadId: string;
  /** What happened, e.g. "Lead moved to Proposal". */
  summary: string;
  status: 'ok' | 'failed';
  /** The actions taken, or the error. */
  detail: string;
}
