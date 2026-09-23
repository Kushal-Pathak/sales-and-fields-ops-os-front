import type { BaseEntity, StatusColor } from './base';

export interface Pipeline extends BaseEntity {
  name: string;
  isDefault: boolean;
}

export type StageKind = 'open' | 'won' | 'lost';

/** A column of a pipeline. Stages are data: businesses define their own. */
export interface Stage extends BaseEntity {
  pipelineId: string;
  name: string;
  color: StatusColor;
  /** Position within the pipeline, ascending. */
  order: number;
  kind: StageKind;
  /** Title of the task to suggest when a lead enters this stage. */
  defaultTaskTitle?: string;
}
