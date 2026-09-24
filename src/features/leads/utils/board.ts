import type { Stage } from '@/types/domain';
import type { LeadRow } from './lead-view-model';

export interface BoardColumn {
  stage: Stage;
  rows: LeadRow[];
  /** Sum of the visible leads' `value`; leads without a value count as 0. */
  total: number;
}

/**
 * Groups already filtered and sorted rows into one column per stage of a pipeline,
 * in stage order. Rows whose stage is missing or belongs to another pipeline are dropped.
 */
export function buildBoard(rows: LeadRow[], stages: Stage[], pipelineId: string): BoardColumn[] {
  const columns = stages
    .filter((stage) => stage.pipelineId === pipelineId)
    .sort((a, b) => a.order - b.order)
    .map<BoardColumn>((stage) => ({ stage, rows: [], total: 0 }));
  const byStage = new Map(columns.map((column) => [column.stage.id, column]));
  for (const row of rows) {
    const column = byStage.get(row.lead.stageId);
    if (!column) continue;
    column.rows.push(row);
    column.total += row.lead.value ?? 0;
  }
  return columns;
}
