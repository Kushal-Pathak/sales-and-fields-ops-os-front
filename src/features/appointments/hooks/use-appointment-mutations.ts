import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { ActivityKind, Appointment, CreateInput, UpdateInput } from '@/types/domain';

/**
 * Appointment mutations. Scheduling, completing and cancelling also write an
 * `Activity` on the lead, because the client owns timelines until a backend exists.
 */

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const AFFECTED = [
  queryKeys.appointments.all,
  queryKeys.activities.all,
  queryKeys.leads.all,
] as const;

async function log(
  appointment: Appointment,
  kind: ActivityKind,
  message: string,
  actorId: string | null,
): Promise<void> {
  await db.activities.create({
    entityType: 'lead',
    entityId: appointment.leadId,
    kind,
    message,
    actorId,
  });
  await db.leads.update(appointment.leadId, { lastActivityAt: new Date().toISOString() });
}

/** The scheduling form's payload: the contact is derived from the lead. */
export type ScheduleInput = Omit<CreateInput<Appointment>, 'contactId' | 'status'>;

export function useCreateAppointment() {
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async (input: ScheduleInput): Promise<Appointment> => {
      const lead = await db.leads.get(input.leadId);
      const created = await db.appointments.create({
        ...input,
        contactId: lead.contactId,
        status: 'scheduled',
      });
      await log(
        created,
        'appointment_scheduled',
        `Appointment scheduled${created.location ? ` at ${created.location}` : ''}`,
        actorId,
      );
      return created;
    },
    onSuccess: () => invalidate(...AFFECTED),
  });
}

/** Edits and reschedules. No activity: the timeline records outcomes, not edits. */
export function useUpdateAppointment() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Appointment> }) =>
      db.appointments.update(id, patch),
    onSuccess: (appointment) => {
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
      return invalidate(queryKeys.appointments.all);
    },
  });
}

/** Records the outcome: status `completed` plus the notes taken. */
export function useCompleteAppointment() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }): Promise<Appointment> => {
      const trimmed = notes.trim();
      const appointment = await db.appointments.update(id, {
        status: 'completed',
        ...(trimmed ? { notes: trimmed } : {}),
      });
      await log(
        appointment,
        'appointment_completed',
        `Appointment completed${trimmed ? `: ${trimmed}` : ''}`,
        actorId,
      );
      return appointment;
    },
    onSuccess: (appointment) => {
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
      return invalidate(...AFFECTED);
    },
  });
}

/** Cancel, restore a cancelled one, or reopen a completed one (back to `scheduled`). */
export function useSetAppointmentStatus() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'scheduled' | 'cancelled';
    }): Promise<Appointment> => {
      const before = await db.appointments.get(id);
      const appointment = await db.appointments.update(id, { status });
      if (status === 'cancelled' && before.status !== 'cancelled') {
        await log(appointment, 'appointment_cancelled', 'Appointment cancelled', actorId);
      }
      return appointment;
    },
    onSuccess: (appointment) => {
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
      return invalidate(...AFFECTED);
    },
  });
}

export function useDeleteAppointment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => db.appointments.remove(id),
    onSuccess: () => invalidate(queryKeys.appointments.all),
  });
}
