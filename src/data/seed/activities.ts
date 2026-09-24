import type { Activity, Appointment, Lead, Quote, Stage, Task } from '@/types/domain';
import type { Clock } from './helpers';

/** Timelines derived from the other seed rows, so they always agree with them. */
export function buildActivities(
  clock: Clock,
  refs: {
    leads: Lead[];
    stages: Stage[];
    tasks: Task[];
    quotes: Quote[];
    appointments: Appointment[];
  },
): Activity[] {
  const activities: Activity[] = [];
  const stageById = new Map(refs.stages.map((stage) => [stage.id, stage]));
  let counter = 0;
  const push = (activity: Omit<Activity, 'id' | 'updatedAt'>) => {
    counter += 1;
    activities.push({ id: `act-${counter}`, updatedAt: activity.createdAt, ...activity });
  };

  for (const lead of refs.leads) {
    push({
      entityType: 'lead',
      entityId: lead.id,
      kind: 'created',
      message: `Lead captured from ${lead.source}`,
      actorId: null,
      createdAt: lead.createdAt,
    });
    const stage = stageById.get(lead.stageId);
    if (stage && stage.order > 0) {
      push({
        entityType: 'lead',
        entityId: lead.id,
        kind: 'stage_changed',
        message: `Stage moved to ${stage.name}`,
        actorId: lead.ownerId,
        createdAt: lead.lastActivityAt,
      });
    }
    if (lead.priority === 'high') {
      push({
        entityType: 'lead',
        entityId: lead.id,
        kind: 'note',
        message: 'Decision expected this month; keep follow-ups tight.',
        actorId: lead.ownerId,
        createdAt: clock.hoursFromNow(-(Number(lead.id.split('-')[1]) * 3 + 4)),
      });
    }
  }

  for (const task of refs.tasks) {
    if (!task.leadId) continue;
    push({
      entityType: 'lead',
      entityId: task.leadId,
      kind: 'task_created',
      message: `Task created: ${task.title}`,
      actorId: task.assigneeId,
      createdAt: task.createdAt,
    });
    if (task.status === 'completed' && task.completedAt) {
      push({
        entityType: 'lead',
        entityId: task.leadId,
        kind: 'task_completed',
        message: `Task completed: ${task.title}`,
        actorId: task.assigneeId,
        createdAt: task.completedAt,
      });
    }
  }

  for (const quote of refs.quotes) {
    if (quote.sentAt) {
      push({
        entityType: 'lead',
        entityId: quote.leadId,
        kind: 'quote_sent',
        message: `Quote ${quote.number} sent to customer`,
        actorId: quote.createdById,
        createdAt: quote.sentAt,
      });
    }
    push({
      entityType: 'quote',
      entityId: quote.id,
      kind: 'quote_status',
      message: `Quote ${quote.number} is ${quote.status.replace('_', ' ')}`,
      actorId: quote.createdById,
      createdAt: quote.updatedAt,
    });
  }

  for (const appointment of refs.appointments) {
    push({
      entityType: 'lead',
      entityId: appointment.leadId,
      kind: 'appointment_scheduled',
      message: `Appointment scheduled${appointment.location ? ` at ${appointment.location}` : ''}`,
      actorId: appointment.assigneeId,
      createdAt: appointment.createdAt,
    });
    if (appointment.status === 'completed') {
      push({
        entityType: 'lead',
        entityId: appointment.leadId,
        kind: 'appointment_completed',
        message: `Appointment completed: ${appointment.notes ?? 'no notes'}`,
        actorId: appointment.assigneeId,
        createdAt: appointment.endAt,
      });
    }
    if (appointment.status === 'cancelled') {
      push({
        entityType: 'lead',
        entityId: appointment.leadId,
        kind: 'appointment_cancelled',
        message: 'Appointment cancelled',
        actorId: appointment.assigneeId,
        createdAt: appointment.updatedAt,
      });
    }
  }

  return activities;
}
