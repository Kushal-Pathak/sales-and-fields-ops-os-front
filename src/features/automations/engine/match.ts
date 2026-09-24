import type { Appointment, Automation, Lead, Quote, Stage } from '@/types/domain';

/** Something that happened to a lead which rules can react to. */
export type AutomationEvent =
  | { type: 'lead_created'; lead: Lead }
  | { type: 'lead_stage_changed'; lead: Lead; fromStageId: string }
  | { type: 'quote_status_changed'; lead: Lead; quote: Quote }
  | { type: 'appointment_completed'; lead: Lead; appointment: Appointment };

export function matches(automation: Automation, event: AutomationEvent): boolean {
  if (!automation.active) return false;
  const { trigger } = automation;
  switch (event.type) {
    case 'lead_created':
      return (
        trigger.type === 'lead_created' &&
        (trigger.source === null ||
          trigger.source.toLowerCase() === event.lead.source.toLowerCase())
      );
    case 'lead_stage_changed':
      return (
        trigger.type === 'lead_stage_changed' &&
        event.lead.stageId !== event.fromStageId &&
        (trigger.stageId === null || trigger.stageId === event.lead.stageId)
      );
    case 'quote_status_changed':
      return trigger.type === 'quote_status_changed' && trigger.status === event.quote.status;
    case 'appointment_completed':
      return trigger.type === 'appointment_completed';
  }
}

/** "Lead moved to Proposal", "Lead created from Website", … for the run log. */
export function describeEvent(event: AutomationEvent, stages: Stage[]): string {
  switch (event.type) {
    case 'lead_created':
      return `Lead created from ${event.lead.source}`;
    case 'lead_stage_changed':
      return `Lead moved to ${stages.find((s) => s.id === event.lead.stageId)?.name ?? 'a stage'}`;
    case 'quote_status_changed':
      return `Quote ${event.quote.number} ${event.quote.status.replace('_', ' ')}`;
    case 'appointment_completed':
      return 'Appointment completed';
  }
}
