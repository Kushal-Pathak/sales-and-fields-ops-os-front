import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, NotFoundError, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinAppointments, type AppointmentRow } from '../utils/appointment-view-model';

/** One appointment for the drawer, joined like the list rows. */
export function useAppointment(id: string | null) {
  const appointment = useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: () => db.appointments.get(id ?? ''),
    enabled: id !== null,
    retry: (count, error) => !(error instanceof NotFoundError) && count < 1,
  });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const users = useUsers();
  const stages = useStages();

  const row = useMemo<AppointmentRow | undefined>(() => {
    if (!appointment.data || !leads.data || !contacts.data || !users.data || !stages.data)
      return undefined;
    return joinAppointments([appointment.data], {
      leads: leads.data,
      contacts: contacts.data,
      users: users.data,
      stages: stages.data,
    })[0];
  }, [appointment.data, leads.data, contacts.data, users.data, stages.data]);

  const queries = [appointment, leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: appointment.error instanceof NotFoundError,
    error:
      queries.find((query) => query.error && !(query.error instanceof NotFoundError))?.error ??
      null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
