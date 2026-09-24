import type { Lead, Priority, Task, TaskStatus, TaskType, User } from '@/types/domain';
import { at, type Clock } from './helpers';

/** [title, lead index (null = none), assignee index, due in days, due hour, type, priority, status] */
const TASKS: [string, number | null, number, number, number, TaskType, Priority, TaskStatus][] = [
  ['Call Aisha to confirm meeting slot', 0, 2, 0, 11, 'call', 'high', 'pending'],
  ['Discovery meeting: Bright Path Tutoring', 1, 4, 0, 15, 'meeting', 'high', 'pending'],
  ['Qualify online ordering enquiry', 2, 3, 0, 17, 'call', 'high', 'pending'],
  ['Qualify fleet tracking enquiry', 3, 3, 1, 10, 'call', 'medium', 'pending'],
  ['Call back Parkside Physiotherapy', 4, 2, -1, 14, 'call', 'high', 'pending'],
  ['Send overview deck to Reed Financial', 5, 0, -2, 9, 'follow_up', 'low', 'pending'],
  ['Send proposal: project showcase site', 6, 4, -1, 16, 'quote', 'medium', 'in_progress'],
  ['Send proposal: clinic reception kiosk', 7, 4, 1, 12, 'quote', 'medium', 'pending'],
  ['Follow up on warranty workflow proposal', 8, 0, 1, 10, 'follow_up', 'medium', 'pending'],
  ['Follow up with Zahra Boutique Hotels', 9, 5, 0, 9, 'follow_up', 'high', 'in_progress'],
  ['Review taproom app pricing', 10, 5, 3, 11, 'follow_up', 'medium', 'pending'],
  ['Kickoff: document intake portal', 11, 5, 2, 10, 'meeting', 'medium', 'pending'],
  ['Collect deposit: refill reminder service', 12, 2, 4, 12, 'payment', 'medium', 'pending'],
  ['Call back Kim Family Dental', 14, 3, 1, 15, 'call', 'medium', 'pending'],
  ['Qualify event enquiry forms lead', 15, 3, 1, 11, 'call', 'medium', 'pending'],
  ['Book discovery meeting: Haddad Auto', 16, 5, 2, 10, 'meeting', 'high', 'pending'],
  ['Send proposal: member check-in app', 17, 0, 0, 13, 'quote', 'high', 'pending'],
  ['Follow-up call: Murphy Roofing', 18, 4, 3, 14, 'call', 'low', 'pending'],
  ['Book discovery meeting: Ahmed Learning', 19, 3, 2, 9, 'meeting', 'medium', 'pending'],
  ['Kickoff: seasonal campaign pages', 20, 4, 1, 10, 'meeting', 'low', 'pending'],
  ['Prepare monthly pipeline report', null, 0, 5, 9, 'general', 'low', 'pending'],
  ['Discovery meeting: Haddad Auto Group', 16, 5, -3, 10, 'meeting', 'high', 'completed'],
  ['Send proposal: guest messaging platform', 9, 5, -4, 15, 'quote', 'high', 'completed'],
  ['Qualify parent portal enquiry', 19, 3, -5, 11, 'call', 'medium', 'completed'],
];

export function buildTasks(clock: Clock, refs: { leads: Lead[]; users: User[] }): Task[] {
  return TASKS.map((row, index) => {
    const [title, leadIndex, assigneeIndex, dueDays, dueHour, type, priority, status] = row;
    const lead = leadIndex === null ? undefined : at(refs.leads, leadIndex, 'leads');
    const dueAt = clock.daysFromNow(dueDays, dueHour);
    return {
      id: `task-${index + 1}`,
      title,
      ...(lead && { leadId: lead.id, contactId: lead.contactId }),
      assigneeId: at(refs.users, assigneeIndex, 'users').id,
      dueAt,
      type,
      priority,
      status,
      ...(status === 'completed' && { completedAt: dueAt }),
      ...clock.stamp(Math.max(1, Math.abs(dueDays) + 2), status === 'completed' ? -dueDays : 0.5),
    };
  });
}
