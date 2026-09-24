import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { describeAction, describeTrigger } from '../utils/automation-labels';
import { describeEvent, matches } from './match';

const seed = buildSeed();
const refs = {
  stages: seed.stages,
  users: seed.users,
  quickReplies: seed.workspace[0]!.quickReplies!,
};
const byId = (id: string) => seed.automations.find((a) => a.id === id)!;
const lead = seed.leads[0]!;

describe('automation matching', () => {
  it('matches lead_created by source, case-insensitively, or any source', () => {
    const website = byId('auto-website');
    expect(matches(website, { type: 'lead_created', lead: { ...lead, source: 'website' } })).toBe(
      true,
    );
    expect(matches(website, { type: 'lead_created', lead: { ...lead, source: 'Referral' } })).toBe(
      false,
    );
    const welcome = { ...byId('auto-welcome'), active: true };
    expect(matches(welcome, { type: 'lead_created', lead: { ...lead, source: 'Referral' } })).toBe(
      true,
    );
  });

  it('matches stage moves only into the configured stage and never inactive rules', () => {
    const proposal = byId('auto-proposal');
    const moved = { ...lead, stageId: 'stg-proposal' };
    expect(
      matches(proposal, { type: 'lead_stage_changed', lead: moved, fromStageId: 'stg-new' }),
    ).toBe(true);
    expect(
      matches(proposal, { type: 'lead_stage_changed', lead: moved, fromStageId: 'stg-proposal' }),
    ).toBe(false);
    expect(
      matches(proposal, {
        type: 'lead_stage_changed',
        lead: { ...lead, stageId: 'stg-won' },
        fromStageId: 'stg-new',
      }),
    ).toBe(false);
    expect(
      matches(
        { ...proposal, active: false },
        { type: 'lead_stage_changed', lead: moved, fromStageId: 'stg-new' },
      ),
    ).toBe(false);
  });

  it('matches quote and appointment events', () => {
    const quote = seed.quotes[0]!;
    expect(
      matches(byId('auto-quote-approved'), {
        type: 'quote_status_changed',
        lead,
        quote: { ...quote, status: 'approved' },
      }),
    ).toBe(true);
    expect(
      matches(byId('auto-quote-approved'), {
        type: 'quote_status_changed',
        lead,
        quote: { ...quote, status: 'sent' },
      }),
    ).toBe(false);
    expect(
      matches(byId('auto-website'), {
        type: 'appointment_completed',
        lead,
        appointment: seed.appointments[0]!,
      }),
    ).toBe(false);
  });

  it('describes triggers, actions and events in plain words', () => {
    expect(describeTrigger(byId('auto-proposal').trigger, refs)).toBe(
      'When a lead moves to Proposal',
    );
    expect(describeTrigger(byId('auto-website').trigger, refs)).toBe(
      'When a lead arrives from Website',
    );
    expect(
      describeTrigger({ type: 'quote_status_changed', status: 'pending_approval' }, refs),
    ).toBe('When a quote is pending approval');
    expect(describeAction(byId('auto-proposal').actions[0]!, refs)).toBe(
      'Create task “Follow up on the proposal” for the owner, due in 3 days',
    );
    expect(describeAction(byId('auto-quote-approved').actions[0]!, refs)).toBe(
      'Send “Quote sent” on WhatsApp',
    );
    expect(describeAction({ type: 'move_stage', stageId: 'nope' }, refs)).toBe(
      'Move the lead to a removed stage',
    );
    expect(
      describeEvent(
        { type: 'lead_stage_changed', lead: { ...lead, stageId: 'stg-won' }, fromStageId: 'x' },
        seed.stages,
      ),
    ).toBe('Lead moved to Won');
  });
});
