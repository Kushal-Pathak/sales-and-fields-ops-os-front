import type { BaseEntity, Priority } from './base';

/** An opportunity with a contact, moving through the stages of a pipeline. */
export interface Lead extends BaseEntity {
  contactId: string;
  /** What the customer wants, e.g. "Office fit-out for new branch". */
  title: string;
  pipelineId: string;
  stageId: string;
  /** The user responsible for this lead. */
  ownerId: string;
  /** One of `Workspace.leadSources`. */
  source: string;
  priority: Priority;
  /** Expected value in the workspace currency. */
  value?: number;
  nextAction?: string;
  nextActionAt?: string;
  lastActivityAt: string;
  notes?: string;
}
