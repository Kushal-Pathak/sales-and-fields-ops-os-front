import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { AUTOMATION_EFFECT_KEYS, runAutomations } from '@/features/automations';
import { useCurrentUser } from '@/features/workspace';
import type { Contact, CreateInput, Lead, UpdateInput } from '@/types/domain';

/**
 * Lead mutations. Each one also writes the matching `Activity` rows: without a
 * backend the client owns the timeline. When the API exists the server records
 * them and these hooks only invalidate. Creating a lead and moving its stage also
 * run the workspace's automations.
 */

export interface CreateLeadInput {
  /** An existing contact id, or the fields of a new contact. */
  contact: { id: string } | CreateInput<Contact>;
  lead: Omit<CreateInput<Lead>, 'contactId' | 'lastActivityAt'>;
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: async ({ contact, lead }: CreateLeadInput): Promise<Lead> => {
      const contactId = 'id' in contact ? contact.id : (await db.contacts.create(contact)).id;
      const created = await db.leads.create({
        ...lead,
        contactId,
        lastActivityAt: new Date().toISOString(),
      });
      await db.activities.create({
        entityType: 'lead',
        entityId: created.id,
        kind: 'created',
        message: `Lead captured from ${created.source}`,
        actorId,
      });
      await runAutomations({ type: 'lead_created', lead: created }, actorId);
      return db.leads.get(created.id);
    },
    onSuccess: () =>
      Promise.all(
        [queryKeys.contacts.all, ...AUTOMATION_EFFECT_KEYS].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

export interface UpdateLeadInput {
  id: string;
  patch: UpdateInput<Lead>;
}

/** Applies a patch, bumps `lastActivityAt`, and logs a stage change when there is one. */
async function applyLeadPatch(
  { id, patch }: UpdateLeadInput,
  actorId: string | null,
): Promise<Lead> {
  const before = await db.leads.get(id);
  const after = await db.leads.update(id, {
    ...patch,
    lastActivityAt: new Date().toISOString(),
  });
  if (patch.stageId && patch.stageId !== before.stageId) {
    const stage = await db.stages.get(patch.stageId);
    await db.activities.create({
      entityType: 'lead',
      entityId: id,
      kind: 'stage_changed',
      message: `Stage moved to ${stage.name}`,
      actorId,
    });
    await runAutomations(
      { type: 'lead_stage_changed', lead: after, fromStageId: before.stageId },
      actorId,
    );
    // A rule may have changed the lead again.
    return db.leads.get(id);
  }
  return after;
}

const AFTER_LEAD_CHANGE = AUTOMATION_EFFECT_KEYS;

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: (input: UpdateLeadInput) => applyLeadPatch(input, actorId),
    onSuccess: (lead) => {
      queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
      return Promise.all(
        AFTER_LEAD_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

/**
 * Stage change from the board: the list cache is updated before the request so the
 * card settles in its new column immediately, and restored if the request fails.
 */
export function useMoveLeadStage() {
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      applyLeadPatch({ id, patch: { stageId } }, actorId),
    onMutate: async ({ id, stageId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.leads.list() });
      const previous = queryClient.getQueryData<Lead[]>(queryKeys.leads.list());
      queryClient.setQueryData<Lead[]>(queryKeys.leads.list(), (rows) =>
        rows?.map((row) => (row.id === id ? { ...row, stageId } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.leads.list(), context.previous);
    },
    onSettled: (lead) => {
      if (lead) queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
      return Promise.all(
        AFTER_LEAD_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });
}

export function useAddLeadNote() {
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: async ({ leadId, message }: { leadId: string; message: string }) => {
      const activity = await db.activities.create({
        entityType: 'lead',
        entityId: leadId,
        kind: 'note',
        message: message.trim(),
        actorId,
      });
      await db.leads.update(leadId, { lastActivityAt: activity.createdAt });
      return activity;
    },
    onSuccess: () =>
      Promise.all(
        [queryKeys.activities.all, queryKeys.leads.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Deletes a lead and everything that only makes sense with it: tasks, quotes, appointments, activity. */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const [tasks, quotes, appointments, activities] = await Promise.all([
        db.tasks.list(),
        db.quotes.list(),
        db.appointments.list(),
        db.activities.list(),
      ]);
      await Promise.all([
        ...tasks.filter((row) => row.leadId === leadId).map((row) => db.tasks.remove(row.id)),
        ...quotes.filter((row) => row.leadId === leadId).map((row) => db.quotes.remove(row.id)),
        ...appointments
          .filter((row) => row.leadId === leadId)
          .map((row) => db.appointments.remove(row.id)),
        ...activities
          .filter((row) => row.entityType === 'lead' && row.entityId === leadId)
          .map((row) => db.activities.remove(row.id)),
      ]);
      await db.leads.remove(leadId);
    },
    onSuccess: () =>
      Promise.all(
        [
          queryKeys.leads.all,
          queryKeys.tasks.all,
          queryKeys.quotes.all,
          queryKeys.appointments.all,
          queryKeys.activities.all,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}
