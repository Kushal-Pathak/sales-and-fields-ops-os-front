import type { Pipeline, Stage, StageKind, StatusColor } from '@/types/domain';
import type { Clock } from './helpers';

export const DEFAULT_PIPELINE_ID = 'pipe-default';

export function buildPipelines(clock: Clock): Pipeline[] {
  return [
    { id: DEFAULT_PIPELINE_ID, name: 'Sales pipeline', isDefault: true, ...clock.stamp(400) },
  ];
}

const STAGES: [
  id: string,
  name: string,
  color: StatusColor,
  kind: StageKind,
  defaultTaskTitle: string | undefined,
][] = [
  ['stg-new', 'New', 'neutral', 'open', 'Qualify the enquiry'],
  ['stg-contacted', 'Contacted', 'info', 'open', 'Follow-up call'],
  ['stg-qualified', 'Qualified', 'highlight', 'open', 'Book discovery meeting'],
  ['stg-proposal', 'Proposal', 'warning', 'open', 'Send proposal'],
  ['stg-negotiation', 'Negotiation', 'warning', 'open', 'Follow up on proposal'],
  ['stg-won', 'Won', 'success', 'won', 'Schedule kickoff'],
  ['stg-lost', 'Lost', 'destructive', 'lost', undefined],
];

export function buildStages(clock: Clock): Stage[] {
  return STAGES.map(([id, name, color, kind, defaultTaskTitle], order) => ({
    id,
    pipelineId: DEFAULT_PIPELINE_ID,
    name,
    color,
    order,
    kind,
    ...(defaultTaskTitle !== undefined && { defaultTaskTitle }),
    ...clock.stamp(400),
  }));
}
