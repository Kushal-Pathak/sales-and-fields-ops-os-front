import { LeadAppointmentList } from '@/features/appointments';
import { LeadQuoteList } from '@/features/quotes';
import { LeadTaskList } from '@/features/tasks';

/** The lead drawer's related tabs; each list is owned by its own feature. */

export function LeadTasksTab({ leadId }: { leadId: string }) {
  return <LeadTaskList leadId={leadId} withCreate />;
}

export function LeadQuotesTab({ leadId }: { leadId: string }) {
  return <LeadQuoteList leadId={leadId} />;
}

export function LeadAppointmentsTab({ leadId }: { leadId: string }) {
  return <LeadAppointmentList leadId={leadId} />;
}
