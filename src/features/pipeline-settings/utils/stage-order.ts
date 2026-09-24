import type { Stage } from '@/types/domain';

export interface StageOrder {
  id: string;
  order: number;
}

/** Stages of one pipeline in display order. */
export function sortedStages(stages: Stage[], pipelineId: string): Stage[] {
  return stages
    .filter((stage) => stage.pipelineId === pipelineId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Moves `activeId` to the position of `overId` and renumbers the pipeline's stages
 * 0..n-1. Returns only the stages whose `order` changed.
 */
export function reorderStages(stages: Stage[], activeId: string, overId: string): StageOrder[] {
  const active = stages.find((stage) => stage.id === activeId);
  if (!active || activeId === overId) return [];
  const list = sortedStages(stages, active.pipelineId);
  const from = list.findIndex((stage) => stage.id === activeId);
  const to = list.findIndex((stage) => stage.id === overId);
  if (from === -1 || to === -1) return [];
  const moved = [...list];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item!);
  return moved
    .map((stage, order) => ({ id: stage.id, order, previous: stage.order }))
    .filter((entry) => entry.order !== entry.previous)
    .map(({ id, order }) => ({ id, order }));
}

/** Where a new stage goes: after the last one. */
export function nextOrder(stages: Stage[], pipelineId: string): number {
  const list = sortedStages(stages, pipelineId);
  return list.length === 0 ? 0 : list[list.length - 1]!.order + 1;
}

/** A pipeline must keep at least one open stage, or new leads have nowhere to go. */
export function canDeleteStage(
  stage: Stage,
  stages: Stage[],
): { ok: true } | { ok: false; reason: string } {
  const siblings = sortedStages(stages, stage.pipelineId);
  if (siblings.length <= 1) return { ok: false, reason: 'A pipeline needs at least one stage.' };
  const openLeft = siblings.filter((item) => item.kind === 'open' && item.id !== stage.id);
  if (stage.kind === 'open' && openLeft.length === 0)
    return { ok: false, reason: 'A pipeline needs at least one open stage.' };
  return { ok: true };
}

/** Stages a deleted stage's leads can move to: the previous open one first, then the rest. */
export function moveTargets(stage: Stage, stages: Stage[]): Stage[] {
  const siblings = sortedStages(stages, stage.pipelineId).filter((item) => item.id !== stage.id);
  const before = siblings
    .filter((item) => item.order < stage.order && item.kind === 'open')
    .reverse();
  const rest = siblings.filter((item) => !before.includes(item));
  return [...before, ...rest];
}
