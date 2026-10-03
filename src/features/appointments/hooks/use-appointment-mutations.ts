import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type Db } from '@/data';
import { AUTOMATION_EFFECT_KEYS, runAutomations } from '@/features/automations';
import { useCurrentUser } from '@/features/workspace';
import type {
  ActivityKind,
  Appointment,
  CreateInput,
  CustomValues,
  UpdateInput,
} from '@/types/domain';

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
  db: Db,
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
  const write = useWriteOperation('appointments');
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async (input: ScheduleInput): Promise<Appointment> =>
      write(async (db) => {
        const lead = await db.leads.get(input.leadId);
        const created = await db.appointments.create({
          ...input,
          contactId: lead.contactId,
          status: 'scheduled',
        });
        await log(
          db,
          created,
          'appointment_scheduled',
          `Appointment scheduled${created.location ? ` at ${created.location}` : ''}`,
          actorId,
        );
        return created;
      }),
    onSettled: () => invalidate(...AFFECTED),
  });
}

/** Edits and reschedules. No activity: the timeline records outcomes, not edits. */
export function useUpdateAppointment() {
  const write = useWriteOperation('appointments');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateInput<Appointment> }) =>
      write(async (db) => db.appointments.update(id, patch)),
    onSuccess: (appointment) => {
      if (write.signal.aborted) return;
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
    },
    onSettled: () => invalidate(queryKeys.appointments.all),
  });
}

/** Records the outcome: status `completed`, the notes taken and the custom outcome fields. */
export function useCompleteAppointment() {
  const write = useWriteOperation('appointments');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({
      id,
      notes,
      outcome,
    }: {
      id: string;
      notes: string;
      outcome?: CustomValues;
    }): Promise<Appointment> =>
      write(async (db) => {
        const trimmed = notes.trim();
        const appointment = await db.appointments.update(id, {
          status: 'completed',
          ...(trimmed ? { notes: trimmed } : {}),
          ...(outcome && { outcome }),
        });
        await log(
          db,
          appointment,
          'appointment_completed',
          `Appointment completed${trimmed ? `: ${trimmed}` : ''}`,
          actorId,
        );
        const lead = await db.leads.get(appointment.leadId);
        await runAutomations({ type: 'appointment_completed', lead, appointment }, actorId, db);
        return appointment;
      }),
    onSuccess: (appointment) => {
      if (write.signal.aborted) return;
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
    },
    onSettled: () => invalidate(...AFFECTED, ...AUTOMATION_EFFECT_KEYS),
  });
}

/** Cancel, restore a cancelled one, or reopen a completed one (back to `scheduled`). */
export function useSetAppointmentStatus() {
  const write = useWriteOperation('appointments');
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
    }): Promise<Appointment> =>
      write(async (db) => {
        const before = await db.appointments.get(id);
        const appointment = await db.appointments.update(id, { status });
        if (status === 'cancelled' && before.status !== 'cancelled') {
          await log(db, appointment, 'appointment_cancelled', 'Appointment cancelled', actorId);
        }
        return appointment;
      }),
    onSuccess: (appointment) => {
      if (write.signal.aborted) return;
      queryClient.setQueryData(queryKeys.appointments.detail(appointment.id), appointment);
    },
    onSettled: () => invalidate(...AFFECTED),
  });
}

export function useDeleteAppointment() {
  const write = useWriteOperation('appointments');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => write(async (db) => db.appointments.remove(id)),
    onSettled: () => invalidate(queryKeys.appointments.all),
  });
}
