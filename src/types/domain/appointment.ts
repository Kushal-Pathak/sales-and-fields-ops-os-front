import type { BaseEntity } from './base';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

export type AppointmentType = 'meeting' | 'video_call' | 'phone_call' | 'on_site';

/** A scheduled meeting, call or visit with a contact about a lead. */
export interface Appointment extends BaseEntity {
  leadId: string;
  contactId: string;
  assigneeId: string;
  type: AppointmentType;
  startAt: string;
  endAt: string;
  location?: string;
  status: AppointmentStatus;
  notes?: string;
  /** Answers captured on completion; keys come from custom field definitions later. */
  outcome?: Record<string, string | number | boolean>;
}

/** Still `scheduled` after it ended: the outcome has not been recorded. */
export function isAppointmentOverdue(
  appointment: Pick<Appointment, 'status' | 'endAt'>,
  now = new Date(),
): boolean {
  return (
    appointment.status === 'scheduled' && new Date(appointment.endAt).getTime() < now.getTime()
  );
}
