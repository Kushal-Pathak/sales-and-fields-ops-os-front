import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { runAutomations } from './run-automations';

const seed = buildSeed();

describe('runAutomations', () => {
  beforeEach(() => resetDemoData());

  it('creates the follow-up task, logs the activity and records the run when a lead reaches Proposal', async () => {
    const lead = { ...seed.leads[0]!, stageId: 'stg-proposal' };
    const before = (await db.tasks.list()).length;
    const runs = await runAutomations(
      { type: 'lead_stage_changed', lead, fromStageId: seed.leads[0]!.stageId },
      'usr-1',
    );
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ automationId: 'auto-proposal', leadId: lead.id, status: 'ok' });

    const tasks = await db.tasks.list();
    expect(tasks).toHaveLength(before + 1);
    const task = tasks.find(
      (t) => t.title === 'Follow up on the proposal' && t.leadId === lead.id,
    )!;
    expect(task.assigneeId).toBe(lead.ownerId);
    expect(task.type).toBe('follow_up');
    const activities = await db.activities.list();
    expect(
      activities.some(
        (a) =>
          a.entityId === lead.id &&
          a.kind === 'automation' &&
          a.message.startsWith('Proposal follow-up:'),
      ),
    ).toBe(true);
    const automation = await db.automations.get('auto-proposal');
    expect(automation.runCount).toBe(10);
    expect(automation.lastRunAt).toBe(runs[0]!.createdAt);
  });

  it('runs every action of a rule and skips inactive ones', async () => {
    const lead = { ...seed.leads[0]!, stageId: 'stg-won' };
    const runs = await runAutomations(
      { type: 'lead_stage_changed', lead, fromStageId: 'stg-proposal' },
      'usr-1',
    );
    expect(runs.map((r) => r.automationId)).toEqual(['auto-won']);
    expect(runs[0]!.detail).toContain('Create task “Schedule kickoff”');
    expect(runs[0]!.detail).toContain('Add a note');
    const notes = (await db.activities.list()).filter(
      (a) => a.entityId === lead.id && a.kind === 'note' && a.message.startsWith('Won.'),
    );
    expect(notes).toHaveLength(1);

    const created = await runAutomations(
      { type: 'lead_created', lead: { ...lead, source: 'Referral' } },
      'usr-1',
    );
    expect(created).toEqual([]);
  });

  it('sends a quick reply into the lead’s thread when a quote is approved', async () => {
    const quote = seed.quotes[0]!;
    const lead = seed.leads.find((l) => l.id === quote.leadId)!;
    const runs = await runAutomations(
      { type: 'quote_status_changed', lead, quote: { ...quote, status: 'approved' } },
      'usr-1',
    );
    expect(runs).toHaveLength(1);
    const conversation = (await db.conversations.list()).find(
      (c) => c.leadId === lead.id && c.channel === 'whatsapp',
    )!;
    const messages = (await db.messages.list()).filter((m) => m.conversationId === conversation.id);
    const sent = messages[messages.length - 1]!;
    expect(sent.direction).toBe('outbound');
    expect(sent.body).toContain('sent over the quote');
    expect(sent.body).not.toContain('{{');
  });

  it('records a failed run when an action cannot complete', async () => {
    await db.automations.update('auto-website', {
      actions: [{ type: 'assign_owner', userId: 'usr-missing' }],
    });
    const runs = await runAutomations(
      { type: 'lead_created', lead: { ...seed.leads[0]!, source: 'Website' } },
      'usr-1',
    );
    expect(runs).toHaveLength(1);
    expect(runs[0]!.status).toBe('failed');
    expect(runs[0]!.detail).toContain('member not found');
  });

  it('skips an action whose module is switched off, records why, and still runs the rest', async () => {
    const workspace = (await db.workspace.list())[0]!;
    await db.workspace.update(workspace.id, {
      modules: workspace.modules.map((module) =>
        module.id === 'tasks' ? { ...module, enabled: false } : module,
      ),
    });
    const lead = { ...seed.leads[0]!, stageId: 'stg-won' };
    const before = (await db.tasks.list()).length;
    const runs = await runAutomations(
      { type: 'lead_stage_changed', lead, fromStageId: 'stg-proposal' },
      'usr-1',
    );
    expect(runs[0]).toMatchObject({ automationId: 'auto-won', status: 'ok' });
    expect(runs[0]!.detail).toContain('Skipped (Tasks is off): Create task “Schedule kickoff”');
    expect(runs[0]!.detail).toContain('Add a note');
    expect(await db.tasks.list()).toHaveLength(before);
    // The rule itself is untouched, so it works again once Tasks is back on.
    expect((await db.automations.get('auto-won')).active).toBe(true);
  });
});
