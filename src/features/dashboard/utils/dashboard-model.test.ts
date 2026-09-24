import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { isTaskOverdue } from '@/types/domain';
import { buildDashboard } from './dashboard-model';

const now = new Date('2026-09-23T14:00:00');
const seed = buildSeed(now);
const model = buildDashboard(seed, now);

describe('buildDashboard', () => {
  it('counts the stat tiles from the seed', () => {
    const won = seed.stages.find((stage) => stage.kind === 'won')!;
    expect(model.stats.overdueTasks).toBe(seed.tasks.filter((t) => isTaskOverdue(t, now)).length);
    expect(model.stats.quotesPending).toBe(
      seed.quotes.filter((q) => q.status === 'pending_approval').length,
    );
    expect(model.stats.appointmentsToday).toBe(
      seed.appointments.filter(
        (a) =>
          a.status === 'scheduled' && new Date(a.startAt).toDateString() === now.toDateString(),
      ).length,
    );
    expect(model.stats.newLeadsToday).toBeGreaterThan(0);
    expect(model.stats.hotLeads).toBe(
      seed.leads.filter(
        (l) =>
          l.priority === 'high' && seed.stages.find((s) => s.id === l.stageId)?.kind === 'open',
      ).length,
    );
    expect(model.stats.wonThisMonth.count).toBeLessThanOrEqual(
      seed.leads.filter((l) => l.stageId === won.id).length,
    );
  });

  it('lists follow-ups due by today, earliest first, flagged when already past', () => {
    const { rows, total } = model.followUps;
    expect(total).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(5);
    const dates = rows.map((row) => row.lead.nextActionAt!);
    expect(dates).toEqual([...dates].sort());
    for (const row of rows) {
      expect(row.stage?.kind).toBe('open');
      expect(row.overdue).toBe(new Date(row.lead.nextActionAt!) < now);
      expect(row.contact?.id).toBe(row.lead.contactId);
    }
  });

  it('caps every panel at five rows but reports the full total', () => {
    for (const panel of [model.followUps, model.appointments, model.quotes, model.overdueTasks]) {
      expect(panel.rows.length).toBe(Math.min(panel.total, 5));
    }
  });

  it('builds the pipeline strip in stage order without the lost stage', () => {
    expect(model.pipeline.map((cell) => cell.stage.kind)).not.toContain('lost');
    expect(model.pipeline.map((cell) => cell.stage.order)).toEqual(
      model.pipeline.map((cell) => cell.stage.order).sort((a, b) => a - b),
    );
    const total = model.pipeline.reduce((sum, cell) => sum + cell.count, 0);
    const lost = seed.stages.find((stage) => stage.kind === 'lost')!;
    expect(total).toBe(seed.leads.filter((lead) => lead.stageId !== lost.id).length);
  });
});
