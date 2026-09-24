import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Activity, Appointment, Quote, Task } from '@/types/domain';

/**
 * Rows related to one lead, filtered client-side from the collection lists so the
 * caches are shared with the sections that own them (Tasks, Quotes, Appointments).
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
    queryFn: () => db.activities.list(),
    enabled: leadId !== null,
    select,
  });
}

export function useLeadTasks(leadId: string | null) {
  const select = useCallback(
    (rows: Task[]) =>
      rows.filter((row) => row.leadId === leadId).sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: () => db.tasks.list(),
    enabled: leadId !== null,
    select,
  });
}

export function useLeadQuotes(leadId: string | null) {
  const select = useCallback(
    (rows: Quote[]) =>
      rows
        .filter((row) => row.leadId === leadId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: () => db.quotes.list(),
    enabled: leadId !== null,
    select,
  });
}

export function useLeadAppointments(leadId: string | null) {
  const select = useCallback(
    (rows: Appointment[]) =>
      rows
        .filter((row) => row.leadId === leadId)
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [leadId],
  );
  return useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => db.appointments.list(),
    enabled: leadId !== null,
    select,
  });
}
