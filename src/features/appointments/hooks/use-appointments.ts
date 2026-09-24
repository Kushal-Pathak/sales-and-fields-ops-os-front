import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinAppointments, type AppointmentRow } from '../utils/appointment-view-model';

/**
 * Every appointment joined with its lead, contact, stage and assignee. Leads are
 * read through the shared cache key, so this feature does not depend on `features/leads`.
 */
export function useAppointments() {
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => db.appointments.list(),
  });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const rows = useMemo<AppointmentRow[] | undefined>(() => {
    if (!appointments.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinAppointments(appointments.data, {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    });
  }, [appointments.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [appointments, leads, contacts, users, stages];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export interface LeadOption {
  lead: { id: string; title: string; contactId: string };
  contact: { name: string } | undefined;
}

/** Lead + contact pairs for the scheduling form's lead picker. */
export function useLeadOptions(): LeadOption[] | undefined {
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  return useMemo(() => {
    if (!leads.data || !contacts.data) return undefined;
    const byId = new Map(contacts.data.map((contact) => [contact.id, contact]));
    return leads.data.map((lead) => ({ lead, contact: byId.get(lead.contactId) }));
  }, [leads.data, contacts.data]);
}
