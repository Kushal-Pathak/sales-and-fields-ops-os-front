import { db as defaultDb, type Db } from '@/data';
import { addDays } from '@/lib/dates';
import { fillTemplate } from '@/lib/templates';
import type {
  Automation,
  AutomationAction,
  AutomationActionType,
  AutomationRun,
  Lead,
  ModuleId,
} from '@/types/domain';
import { describeAction, type LabelRefs } from '../utils/automation-labels';
import { describeEvent, matches, type AutomationEvent } from './match';

/** Actions that write into another module. They are skipped while the workspace has it off. */
const ACTION_MODULE: Partial<Record<AutomationActionType, { id: ModuleId; label: string }>> = {
  create_task: { id: 'tasks', label: 'Tasks' },
  send_message: { id: 'inbox', label: 'Inbox' },
};

/**
 * Executes every active rule that matches `event`, in creation order. Runs against
 * `db` directly because it is called from inside other mutations. Actions never
 * re-enter the engine, so a rule that moves a stage cannot trigger itself.
 * Rules run for the workspace, not for the actor: an action is skipped (and the run
 * says so) when the workspace has its module switched off, whatever the actor's role.
 * A backend replaces this whole file; the rule shape stays the same.
 */
export async function runAutomations(
  event: AutomationEvent,
  actorId: string | null,
  db: Db = defaultDb,
): Promise<AutomationRun[]> {
  const automations = (await db.automations.list()).filter((rule) => matches(rule, event));
  if (automations.length === 0) return [];

  const [stages, users, workspace, contacts] = await Promise.all([
    db.stages.list(),
    db.users.list(),
    db.workspace.list(),
    db.contacts.list(),
  ]);
  const refs: LabelRefs = {
    stages,
    users,
    quickReplies: workspace[0]?.quickReplies ?? [],
  };
  const summary = describeEvent(event, stages);
  const enabled = new Set(
    (workspace[0]?.modules ?? []).filter((module) => module.enabled).map((module) => module.id),
  );
  const runs: AutomationRun[] = [];

  for (const automation of automations) {
    // Re-read the lead so actions see what earlier rules changed.
    const lead = await db.leads.get(event.lead.id);
    const contact = contacts.find((row) => row.id === lead.contactId);
    const done: string[] = [];
    let failure: string | null = null;
    for (const action of automation.actions) {
      const target = ACTION_MODULE[action.type];
      if (target && !enabled.has(target.id)) {
        done.push(`Skipped (${target.label} is off): ${describeAction(action, refs)}`);
        continue;
      }
      try {
        await execute(db, action, lead, automation, refs, contact?.name, actorId);
        done.push(describeAction(action, refs));
      } catch (error) {
        failure = `${describeAction(action, refs)}: ${error instanceof Error ? error.message : 'failed'}`;
        break;
      }
    }
    const run = await db.automationRuns.create({
      automationId: automation.id,
      leadId: lead.id,
      summary,
      status: failure ? 'failed' : 'ok',
      detail: failure ? [...done, failure].join(' · ') : done.join(' · '),
    });
    await db.automations.update(automation.id, {
      lastRunAt: run.createdAt,
      runCount: automation.runCount + 1,
    });
    runs.push(run);
  }
  return runs;
}

async function log(db: Db, lead: Lead, automation: Automation, message: string): Promise<void> {
  await db.activities.create({
    entityType: 'lead',
    entityId: lead.id,
    kind: 'automation',
    message: `${automation.name}: ${message}`,
    actorId: null,
  });
}

async function execute(
  db: Db,
  action: AutomationAction,
  lead: Lead,
  automation: Automation,
  refs: LabelRefs,
  contactName: string | undefined,
  actorId: string | null,
): Promise<void> {
  const now = new Date();
  switch (action.type) {
    case 'create_task': {
      const assigneeId = action.assignee === 'owner' ? lead.ownerId : action.assignee;
      if (!refs.users.some((user) => user.id === assigneeId)) throw new Error('assignee not found');
      const due = addDays(now, action.dueInDays);
      due.setHours(9, 0, 0, 0);
      await db.tasks.create({
        title: action.title,
        type: action.taskType,
        leadId: lead.id,
        contactId: lead.contactId,
        assigneeId,
        dueAt: due.toISOString(),
        priority: action.priority,
        status: 'pending',
      });
      await log(db, lead, automation, `created task “${action.title}”`);
      return;
    }
    case 'move_stage': {
      const stage = refs.stages.find((row) => row.id === action.stageId);
      if (!stage) throw new Error('stage not found');
      if (lead.stageId === stage.id) return;
      await db.leads.update(lead.id, { stageId: stage.id, lastActivityAt: now.toISOString() });
      await db.activities.create({
        entityType: 'lead',
        entityId: lead.id,
        kind: 'stage_changed',
        message: `Stage moved to ${stage.name} by ${automation.name}`,
        actorId: null,
      });
      return;
    }
    case 'assign_owner': {
      const user = refs.users.find((row) => row.id === action.userId);
      if (!user) throw new Error('member not found');
      if (lead.ownerId === user.id) return;
      await db.leads.update(lead.id, { ownerId: user.id, lastActivityAt: now.toISOString() });
      await log(db, lead, automation, `assigned to ${user.name}`);
      return;
    }
    case 'send_message': {
      const reply = refs.quickReplies.find((row) => row.id === action.quickReplyId);
      if (!reply) throw new Error('quick reply not found');
      const owner = refs.users.find((row) => row.id === lead.ownerId);
      const body = fillTemplate(reply.body, {
        name: contactName,
        owner: owner?.name,
      });
      const existing = (await db.conversations.list()).find(
        (row) => row.leadId === lead.id && row.channel === action.channel,
      );
      const iso = now.toISOString();
      const conversation =
        existing ??
        (await db.conversations.create({
          contactId: lead.contactId,
          leadId: lead.id,
          channel: action.channel,
          lastMessageAt: iso,
          unreadCount: 0,
        }));
      await db.messages.create({
        conversationId: conversation.id,
        direction: 'outbound',
        body,
        sentAt: iso,
      });
      await db.conversations.update(conversation.id, { lastMessageAt: iso });
      await db.leads.update(lead.id, { lastActivityAt: iso });
      await log(db, lead, automation, `sent “${reply.title}” on ${action.channel}`);
      return;
    }
    case 'add_note': {
      await db.activities.create({
        entityType: 'lead',
        entityId: lead.id,
        kind: 'note',
        message: action.text,
        actorId,
      });
      await db.leads.update(lead.id, { lastActivityAt: now.toISOString() });
      await log(db, lead, automation, 'added a note');
      return;
    }
  }
}
