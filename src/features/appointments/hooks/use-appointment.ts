import { getQueryError } from '@/data/query-state';
import { shouldRetryQuery } from '@/data/errors';
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
    queryFn: ({ signal }) => db.appointments.get(id ?? '', { signal }),
    enabled: id !== null,
    retry: shouldRetryQuery,
  });
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
  });
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

  const queries =
    id !== null ? [appointment, leads, contacts, users, stages] : [leads, contacts, users, stages];
  return {
    row,
    isPending: id !== null && queries.some((query) => query.isPending),
    notFound: appointment.error instanceof NotFoundError,
    error: getQueryError(queries.filter((query) => !(query.error instanceof NotFoundError))),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
