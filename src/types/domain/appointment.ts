import type { BaseEntity } from './base';

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled';

/** A scheduled meeting or visit with a contact about a lead. */
export interface Appointment extends BaseEntity {
  leadId: string;
  contactId: string;
  assigneeId: string;
  startAt: string;
  endAt: string;
  location?: string;
  status: AppointmentStatus;
  notes?: string;
  /** Answers captured on completion; keys come from custom field definitions later. */
  outcome?: Record<string, string | number | boolean>;
}
