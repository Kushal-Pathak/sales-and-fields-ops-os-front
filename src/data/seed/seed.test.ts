import { describe, expect, it } from 'vitest';
import { isTaskOverdue } from '@/types/domain';
import { buildSeed } from './index';

const now = new Date('2026-09-23T14:00:00');
const seed = buildSeed(now);

const ids = (rows: readonly { id: string }[]) => new Set(rows.map((r) => r.id));
const sameDay = (iso: string) => new Date(iso).toDateString() === now.toDateString();

describe('buildSeed', () => {
  it('has unique ids within every collection', () => {
    for (const [name, rows] of Object.entries(seed)) {
      expect(ids(rows).size, name).toBe(rows.length);
    }
  });

  it('resolves every foreign key', () => {
    const contacts = ids(seed.contacts);
    const users = ids(seed.users);
    const roles = ids(seed.roles);
    const stages = ids(seed.stages);
    const pipelines = ids(seed.pipelines);
    const leads = ids(seed.leads);
    const conversations = ids(seed.conversations);

    for (const user of seed.users) expect(roles.has(user.roleId), user.id).toBe(true);
    for (const stage of seed.stages) expect(pipelines.has(stage.pipelineId), stage.id).toBe(true);
    for (const lead of seed.leads) {
      expect(contacts.has(lead.contactId), lead.id).toBe(true);
      expect(stages.has(lead.stageId), lead.id).toBe(true);
      expect(pipelines.has(lead.pipelineId), lead.id).toBe(true);
      expect(users.has(lead.ownerId), lead.id).toBe(true);
      expect(seed.workspace[0]?.leadSources, lead.id).toContain(lead.source);
    }
    for (const task of seed.tasks) {
      expect(users.has(task.assigneeId), task.id).toBe(true);
      if (task.leadId) expect(leads.has(task.leadId), task.id).toBe(true);
      if (task.contactId) expect(contacts.has(task.contactId), task.id).toBe(true);
    }
    for (const apt of seed.appointments) {
      expect(leads.has(apt.leadId), apt.id).toBe(true);
      expect(contacts.has(apt.contactId), apt.id).toBe(true);
      expect(users.has(apt.assigneeId), apt.id).toBe(true);
    }
    for (const quote of seed.quotes) {
      expect(leads.has(quote.leadId), quote.id).toBe(true);
      expect(contacts.has(quote.contactId), quote.id).toBe(true);
      expect(users.has(quote.createdById), quote.id).toBe(true);
      expect(quote.items.length, quote.id).toBeGreaterThan(0);
    }
    for (const activity of seed.activities) {
      const target = activity.entityType === 'lead' ? leads : ids(seed.quotes);
      expect(target.has(activity.entityId), activity.id).toBe(true);
      if (activity.actorId !== null) expect(users.has(activity.actorId), activity.id).toBe(true);
    }
    for (const conversation of seed.conversations) {
      expect(contacts.has(conversation.contactId), conversation.id).toBe(true);
      if (conversation.leadId) expect(leads.has(conversation.leadId), conversation.id).toBe(true);
    }
    for (const message of seed.messages) {
      expect(conversations.has(message.conversationId), message.id).toBe(true);
    }
    for (const automation of seed.automations) {
      expect(users.has(automation.createdById), automation.id).toBe(true);
      expect(automation.actions.length, automation.id).toBeGreaterThan(0);
    }
    const automations = ids(seed.automations);
    for (const run of seed.automationRuns) {
      expect(automations.has(run.automationId), run.id).toBe(true);
      expect(leads.has(run.leadId), run.id).toBe(true);
    }
    const fieldKeys = new Set(seed.fields.map((f) => `${f.entity}:${f.key}`));
    expect(fieldKeys.size).toBe(seed.fields.length);
    for (const lead of seed.leads) {
      for (const key of Object.keys(lead.custom ?? {})) {
        expect(fieldKeys.has(`lead:${key}`), `${lead.id}.${key}`).toBe(true);
      }
    }
  });

  it('has exactly one default pipeline with uniquely ordered stages', () => {
    expect(seed.pipelines.filter((p) => p.isDefault)).toHaveLength(1);
    const orders = seed.stages.map((s) => s.order);
    expect(new Set(orders).size).toBe(orders.length);
    expect(seed.stages.some((s) => s.kind === 'won')).toBe(true);
    expect(seed.stages.some((s) => s.kind === 'lost')).toBe(true);
  });

  it('includes work for today, overdue work and upcoming appointments', () => {
    expect(seed.tasks.some((t) => isTaskOverdue(t, now))).toBe(true);
    expect(seed.tasks.some((t) => t.status !== 'completed' && sameDay(t.dueAt))).toBe(true);
    expect(seed.appointments.some((a) => a.status === 'scheduled' && sameDay(a.startAt))).toBe(
      true,
    );
    expect(seed.appointments.some((a) => new Date(a.startAt) > now)).toBe(true);
    expect(seed.quotes.some((q) => q.status === 'pending_approval')).toBe(true);
    expect(seed.conversations.some((c) => c.unreadCount > 0)).toBe(true);
  });

  it('keeps conversation summaries consistent with their messages', () => {
    for (const conversation of seed.conversations) {
      const times = seed.messages
        .filter((m) => m.conversationId === conversation.id)
        .map((m) => m.sentAt)
        .sort();
      expect(times.length).toBeGreaterThan(0);
      expect(conversation.lastMessageAt).toBe(times[times.length - 1]);
    }
  });
});
