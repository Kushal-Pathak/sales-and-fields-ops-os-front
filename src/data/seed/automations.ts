import type { Automation, AutomationRun, Lead, Stage, User } from '@/types/domain';
import { at, type Clock } from './helpers';

/** Generic rules that mirror what most teams set up first. */
export function buildAutomations(
  clock: Clock,
  refs: { stages: Stage[]; users: User[]; leads: Lead[] },
): { automations: Automation[]; automationRuns: AutomationRun[] } {
  const stage = (id: string) =>
    at(
      refs.stages,
      refs.stages.findIndex((s) => s.id === id),
      'stages',
    );
  const proposal = stage('stg-proposal');
  const won = stage('stg-won');
  const admin = at(refs.users, 0, 'users');
  const rep = at(refs.users, 2, 'users');

  const automations: Automation[] = [
    {
      id: 'auto-website',
      name: 'Assign website leads',
      trigger: { type: 'lead_created', source: 'Website' },
      actions: [{ type: 'assign_owner', userId: rep.id }],
      active: true,
      createdById: admin.id,
      lastRunAt: clock.hoursFromNow(-5),
      runCount: 14,
      ...clock.stamp(120, 5),
    },
    {
      id: 'auto-proposal',
      name: 'Proposal follow-up',
      trigger: { type: 'lead_stage_changed', stageId: proposal.id },
      actions: [
        {
          type: 'create_task',
          title: 'Follow up on the proposal',
          taskType: 'follow_up',
          assignee: 'owner',
          dueInDays: 3,
          priority: 'medium',
        },
      ],
      active: true,
      createdById: admin.id,
      lastRunAt: clock.daysFromNow(-1, 15),
      runCount: 9,
      ...clock.stamp(90, 1),
    },
    {
      id: 'auto-quote-approved',
      name: 'Quote approved message',
      trigger: { type: 'quote_status_changed', status: 'approved' },
      actions: [{ type: 'send_message', channel: 'whatsapp', quickReplyId: 'qr-quote' }],
      active: true,
      createdById: admin.id,
      lastRunAt: clock.daysFromNow(-3, 11),
      runCount: 4,
      ...clock.stamp(60, 3),
    },
    {
      id: 'auto-won',
      name: 'Kickoff after win',
      trigger: { type: 'lead_stage_changed', stageId: won.id },
      actions: [
        {
          type: 'create_task',
          title: 'Schedule kickoff',
          taskType: 'meeting',
          assignee: 'owner',
          dueInDays: 2,
          priority: 'high',
        },
        { type: 'add_note', text: 'Won. Hand over to delivery and confirm the start date.' },
      ],
      active: true,
      createdById: admin.id,
      lastRunAt: clock.daysFromNow(-6, 9),
      runCount: 3,
      ...clock.stamp(60, 6),
    },
    {
      id: 'auto-welcome',
      name: 'Welcome email',
      trigger: { type: 'lead_created', source: null },
      actions: [{ type: 'send_message', channel: 'email', quickReplyId: 'qr-greeting' }],
      active: false,
      createdById: admin.id,
      runCount: 0,
      ...clock.stamp(30),
    },
  ];

  const inProposal = refs.leads.filter((lead) => lead.stageId === proposal.id).slice(0, 2);
  const automationRuns: AutomationRun[] = inProposal.map((lead, index) => {
    const createdAt = clock.daysFromNow(-(index + 1), 15);
    return {
      id: `run-${index + 1}`,
      automationId: 'auto-proposal',
      leadId: lead.id,
      summary: `Lead moved to ${proposal.name}`,
      status: 'ok',
      detail: 'Created task “Follow up on the proposal” for the owner, due in 3 days',
      createdAt,
      updatedAt: createdAt,
    };
  });

  return { automations, automationRuns };
}
