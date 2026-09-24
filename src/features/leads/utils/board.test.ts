import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { DEFAULT_PIPELINE_ID } from '@/data/seed/pipelines';
import { buildBoard } from './board';
import { joinLeads } from './lead-view-model';

const seed = buildSeed(new Date('2026-09-23T14:00:00'));
const rows = joinLeads(seed.leads, seed);

describe('buildBoard', () => {
  it('has one column per stage in order, including empty ones', () => {
    const board = buildBoard([], seed.stages, DEFAULT_PIPELINE_ID);
    expect(board.map((column) => column.stage.id)).toEqual(
      [...seed.stages].sort((a, b) => a.order - b.order).map((stage) => stage.id),
    );
    expect(board.every((column) => column.rows.length === 0 && column.total === 0)).toBe(true);
  });

  it('places every row in its stage and sums values', () => {
    const board = buildBoard(rows, seed.stages, DEFAULT_PIPELINE_ID);
    expect(board.reduce((sum, column) => sum + column.rows.length, 0)).toBe(rows.length);
    for (const column of board) {
      expect(column.rows.every((row) => row.lead.stageId === column.stage.id)).toBe(true);
      expect(column.total).toBe(column.rows.reduce((sum, row) => sum + (row.lead.value ?? 0), 0));
    }
  });

  it('drops rows from other pipelines and keeps row order', () => {
    const foreign = { ...rows[0]!, lead: { ...rows[0]!.lead, stageId: 'elsewhere' } };
    const board = buildBoard([foreign, ...rows], seed.stages, DEFAULT_PIPELINE_ID);
    expect(board.reduce((sum, column) => sum + column.rows.length, 0)).toBe(rows.length);
    const column = board.find((item) => item.rows.length > 1)!;
    const ids = column.rows.map((row) => row.lead.id);
    const expected = rows
      .filter((row) => row.lead.stageId === column.stage.id)
      .map((row) => row.lead.id);
    expect(ids).toEqual(expected);
  });
});
