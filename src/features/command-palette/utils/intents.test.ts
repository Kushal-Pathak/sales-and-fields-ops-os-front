import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { isTaskOverdue } from '@/types/domain';
import { answerIntent, hotLeadsToAssign, parseDueDate, parseIntent } from './intents';

const now = new Date('2026-09-24T15:00:00');
const seed = buildSeed(now);
const parse = (text: string) => parseIntent(text, seed, now);

describe('parseIntent', () => {
  it('recognises the read-only questions in several phrasings', () => {
    expect(parse('Show overdue tasks')?.type).toBe('overdue_tasks');
    expect(parse("what's overdue?")?.type).toBe('overdue_tasks');
    expect(parse('Find leads without follow-up this week')?.type).toBe('leads_without_follow_up');
    expect(parse('stale leads')?.type).toBe('leads_without_follow_up');
    expect(parse('hot leads')?.type).toBe('hot_leads');
    expect(parse('quotes awaiting approval')?.type).toBe('pending_quotes');
    expect(parse('Summarise today’s messages')?.type).toBe('unread_messages');
    expect(parse('unread replies')?.type).toBe('unread_messages');
    expect(parse("what's on today")?.type).toBe('today');
    expect(parse('my day')?.type).toBe('today');
    expect(parse('how is the weather')).toBeNull();
    expect(parse('')).toBeNull();
  });

  it('builds a create-task intent from a contact name and a date word', () => {
    const contact = seed.contacts[0]!;
    const first = contact.name.split(' ')[0]!;
    const intent = parse(`create a follow-up task for ${first} tomorrow`);
    expect(intent?.type).toBe('create_task');
    if (intent?.type !== 'create_task') throw new Error('expected create_task');
    expect(intent.contact.id).toBe(contact.id);
    expect(intent.lead?.contactId).toBe(contact.id);
    expect(intent.taskType).toBe('follow_up');
    expect(intent.title).toBe(`Follow up with ${contact.name}`);
    expect(intent.dueAt).toBe(new Date('2026-09-25T09:00:00').toISOString());

    const call = parse(`add a call task for ${contact.name} on friday`);
    expect(call).toMatchObject({
      type: 'create_task',
      taskType: 'call',
      title: `Call ${contact.name}`,
    });
    expect(parse('create a task for Nobody Known tomorrow')).toBeNull();
  });

  it('recognises the bulk assignment by first or full name', () => {
    const owner = seed.users.find((user) => user.active)!;
    expect(parse(`assign all hot leads to ${owner.name.split(' ')[0]}`)).toMatchObject({
      type: 'assign_hot_leads',
      owner: { id: owner.id },
    });
    expect(parse('assign hot leads to nobody')).toBeNull();
  });

  it('parses due-date words', () => {
    expect(parseDueDate('tomorrow', now)?.dueAt.toISOString()).toBe(
      new Date('2026-09-25T09:00:00').toISOString(),
    );
    expect(parseDueDate('in 3 days', now)?.dueAt.getDate()).toBe(27);
    expect(parseDueDate('next week', now)?.dueAt.getDate()).toBe(1);
    // Thursday → next Thursday, never today.
    expect(parseDueDate('on thursday', now)?.dueAt.getDate()).toBe(1);
    expect(parseDueDate('on friday', now)?.dueAt.getDate()).toBe(25);
    expect(parseDueDate('whenever', now)).toBeNull();
  });
});

describe('answerIntent', () => {
  it('counts overdue tasks and links each row', () => {
    const answer = answerIntent({ type: 'overdue_tasks' }, seed, now)!;
    const overdue = seed.tasks.filter((task) => isTaskOverdue(task, now));
    expect(answer.total).toBe(overdue.length);
    expect(answer.title).toBe(`${overdue.length} overdue tasks`);
    expect(answer.rows.length).toBeLessThanOrEqual(5);
    expect(answer.rows[0]!.to).toMatch(/^\/tasks\?view=overdue&task=/);
    expect(answer.to).toBe('/tasks?view=overdue');
  });

  it('answers the other read-only intents from the seed', () => {
    expect(answerIntent({ type: 'pending_quotes' }, seed, now)!.total).toBe(
      seed.quotes.filter((quote) => quote.status === 'pending_approval').length,
    );
    expect(answerIntent({ type: 'unread_messages' }, seed, now)!.total).toBe(
      seed.conversations.filter((row) => row.unreadCount > 0).length,
    );
    expect(answerIntent({ type: 'hot_leads' }, seed, now)!.total).toBeGreaterThan(0);
    expect(
      answerIntent({ type: 'today' }, seed, now)!.rows.some(
        (row) => row.badge?.label === 'Appointment',
      ),
    ).toBe(true);
    expect(
      answerIntent({ type: 'leads_without_follow_up' }, seed, now)!.rows.length,
    ).toBeGreaterThan(0);
  });

  it('lists the hot leads a bulk assignment would move', () => {
    const owner = seed.users[1]!;
    const { leadIds, confirmText } = hotLeadsToAssign(owner, seed);
    expect(leadIds.length).toBeGreaterThan(0);
    expect(confirmText).toContain(`${leadIds.length} hot lead`);
    expect(confirmText).toContain(owner.name);
    for (const id of leadIds)
      expect(seed.leads.find((lead) => lead.id === id)!.ownerId).not.toBe(owner.id);
  });
});
