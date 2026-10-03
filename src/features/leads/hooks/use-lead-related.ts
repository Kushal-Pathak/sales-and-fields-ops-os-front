import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useModule } from '@/features/auth';
import type { Activity, Appointment, Quote, Task } from '@/types/domain';

/**
 * Rows related to one lead, filtered client-side from the collection lists so the
 * caches are shared with the sections that own them (Tasks, Quotes, Appointments).
 * Each list belongs to a module: while that module is closed to the user it is not
 * fetched and `data` stays `undefined`.
 */
export function useLeadActivities(leadId: string | null) {
  const select = useCallback(
    (rows: Activity[]) =>
      rows
        .filter((row) => row.entityType === 'lead' && row.entityId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.activities.list(),
    queryFn: ({ signal }) => db.activities.list({ signal }),
    enabled: leadId !== null,
    select,
  });
}

export function useLeadTasks(leadId: string | null) {
  const open = useModule('tasks').status === 'allowed';
  const select = useCallback(
    (rows: Task[]) =>
      rows.filter((row) => row.leadId === leadId).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: ({ signal }) => db.tasks.list({ signal }),
    enabled: leadId !== null && open,
    select,
  });
}

export function useLeadQuotes(leadId: string | null) {
  const open = useModule('quotes').status === 'allowed';
  const select = useCallback(
    (rows: Quote[]) =>
      rows
        .filter((row) => row.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: ({ signal }) => db.quotes.list({ signal }),
    enabled: leadId !== null && open,
    select,
  });
}

export function useLeadAppointments(leadId: string | null) {
  const open = useModule('appointments').status === 'allowed';
  const select = useCallback(
    (rows: Appointment[]) =>
      rows
        .filter((row) => row.leadId === leadId)
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: ({ signal }) => db.appointments.list({ signal }),
    enabled: leadId !== null && open,
    select,
  });
}
