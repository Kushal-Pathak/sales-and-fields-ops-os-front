import type {
  AutomationAction,
  AutomationActionType,
  AutomationTrigger,
  AutomationTriggerType,
  Channel,
  QuickReply,
  Stage,
  User,
} from '@/types/domain';

export const TRIGGER_TYPES: AutomationTriggerType[] = [
  'lead_created',
  'lead_stage_changed',
  'quote_status_changed',
  'appointment_completed',
];

export const TRIGGER_LABEL: Record<AutomationTriggerType, string> = {
  lead_created: 'A lead is created',
  lead_stage_changed: 'A lead moves to a stage',
  quote_status_changed: 'A quote changes status',
  appointment_completed: 'An appointment is completed',
};

export const ACTION_TYPES: AutomationActionType[] = [
  'create_task',
  'move_stage',
  'assign_owner',
  'send_message',
  'add_note',
];

export const ACTION_LABEL: Record<AutomationActionType, string> = {
  create_task: 'Create a task',
  move_stage: 'Move the lead to a stage',
  assign_owner: 'Assign an owner',
  send_message: 'Send a quick reply',
  add_note: 'Add a note',
};

const CHANNEL_NAME: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'email',
  chat: 'web chat',
};

export interface LabelRefs {
  stages: Stage[];
  users: User[];
  quickReplies: QuickReply[];
}

const QUOTE_STATUS_TEXT: Record<string, string> = {
  draft: 'draft',
  pending_approval: 'pending approval',
  approved: 'approved',
  rejected: 'rejected',
  sent: 'sent',
  accepted: 'accepted',
  declined: 'declined',
};

/** "When a lead moves to Proposal". */
export function describeTrigger(trigger: AutomationTrigger, refs: LabelRefs): string {
  switch (trigger.type) {
    case 'lead_created':
      return trigger.source
        ? `When a lead arrives from ${trigger.source}`
        : 'When any lead is created';
    case 'lead_stage_changed': {
      const stage = refs.stages.find((row) => row.id === trigger.stageId);
      return trigger.stageId
        ? `When a lead moves to ${stage?.name ?? 'a removed stage'}`
        : 'When a lead moves to any stage';
    }
    case 'quote_status_changed':
      return `When a quote is ${QUOTE_STATUS_TEXT[trigger.status] ?? trigger.status}`;
    case 'appointment_completed':
      return 'When an appointment is completed';
  }
}

/** "Create task “Follow up” for the owner, due in 3 days". */
export function describeAction(action: AutomationAction, refs: LabelRefs): string {
  switch (action.type) {
    case 'create_task': {
      const who =
        action.assignee === 'owner'
          ? 'the owner'
          : (refs.users.find((row) => row.id === action.assignee)?.name ?? 'a removed member');
      const due =
        action.dueInDays === 0
          ? 'due today'
          : `due in ${action.dueInDays} day${action.dueInDays === 1 ? '' : 's'}`;
      return `Create task “${action.title}” for ${who}, ${due}`;
    }
    case 'move_stage':
      return `Move the lead to ${refs.stages.find((row) => row.id === action.stageId)?.name ?? 'a removed stage'}`;
    case 'assign_owner':
      return `Assign to ${refs.users.find((row) => row.id === action.userId)?.name ?? 'a removed member'}`;
    case 'send_message': {
      const reply = refs.quickReplies.find((row) => row.id === action.quickReplyId);
      return `Send “${reply?.title ?? 'a removed quick reply'}” on ${CHANNEL_NAME[action.channel]}`;
    }
    case 'add_note':
      return `Add a note: “${action.text.length > 60 ? `${action.text.slice(0, 60)}…` : action.text}”`;
  }
}

export function describeActions(actions: AutomationAction[], refs: LabelRefs): string {
  return actions.map((action) => describeAction(action, refs)).join(' · ');
}
