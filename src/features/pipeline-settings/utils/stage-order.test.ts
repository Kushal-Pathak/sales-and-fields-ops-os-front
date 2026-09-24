import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { DEFAULT_PIPELINE_ID } from '@/data/seed/pipelines';
import { canDeleteStage, moveTargets, nextOrder, reorderStages, sortedStages } from './stage-order';

const seed = buildSeed(new Date('2026-09-23T14:00:00'));
const stages = seed.stages;
const ids = sortedStages(stages, DEFAULT_PIPELINE_ID).map((stage) => stage.id);

describe('reorderStages', () => {
  it('moves a stage down and renumbers only what changed', () => {
    const changes = reorderStages(stages, ids[0]!, ids[2]!);
    expect(changes).toEqual([
      { id: ids[1], order: 0 },
      { id: ids[2], order: 1 },
      { id: ids[0], order: 2 },
    ]);
  });

  it('moves a stage up', () => {
    const changes = reorderStages(stages, ids[3]!, ids[1]!);
    expect(changes.map((change) => change.id)).toEqual([ids[3], ids[1], ids[2]]);
    expect(changes.map((change) => change.order)).toEqual([1, 2, 3]);
  });

  it('returns nothing for a no-op or unknown ids', () => {
    expect(reorderStages(stages, ids[1]!, ids[1]!)).toEqual([]);
    expect(reorderStages(stages, 'ghost', ids[1]!)).toEqual([]);
  });
});

describe('nextOrder', () => {
  it('appends after the last stage', () => {
    expect(nextOrder(stages, DEFAULT_PIPELINE_ID)).toBe(ids.length);
    expect(nextOrder([], DEFAULT_PIPELINE_ID)).toBe(0);
  });
});

describe('canDeleteStage', () => {
  it('allows deleting an open stage while others remain', () => {
    expect(canDeleteStage(stages[0]!, stages)).toEqual({ ok: true });
  });

  it('refuses the last open stage', () => {
    const won = stages.find((stage) => stage.kind === 'won')!;
    const onlyOpen = stages.find((stage) => stage.kind === 'open')!;
    expect(canDeleteStage(onlyOpen, [onlyOpen, won]).ok).toBe(false);
    expect(canDeleteStage(won, [onlyOpen, won]).ok).toBe(true);
    expect(canDeleteStage(onlyOpen, [onlyOpen]).ok).toBe(false);
  });
});

describe('moveTargets', () => {
  it('offers the previous open stage first and excludes the stage itself', () => {
    const proposal = stages.find((stage) => stage.name === 'Proposal')!;
    const targets = moveTargets(proposal, stages).map((stage) => stage.name);
    expect(targets[0]).toBe('Qualified');
    expect(targets).not.toContain('Proposal');
    expect(targets).toHaveLength(stages.length - 1);
  });
});
