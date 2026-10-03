import { beginOptimisticListUpdate } from '@/data/optimistic-list';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type Db } from '@/data';
import { deleteLead } from '@/data/lead-commands';
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
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: async ({ contact, lead }: CreateLeadInput): Promise<Lead> =>
      write(async (db) => {
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
        await runAutomations({ type: 'lead_created', lead: created }, actorId, db);
        return db.leads.get(created.id);
      }),
    onSettled: () =>
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
  db: Db,
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
      db,
    );
    // A rule may have changed the lead again.
    return db.leads.get(id);
  }
  return after;
}

const AFTER_LEAD_CHANGE = AUTOMATION_EFFECT_KEYS;

export function useUpdateLead() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: (input: UpdateLeadInput) => write(async (db) => applyLeadPatch(db, input, actorId)),
    onSuccess: (lead) => {
      if (write.signal.aborted) return;
      queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
    },
    onSettled: () =>
      Promise.all(AFTER_LEAD_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/**
 * Stage change from the board: the list cache is updated before the request so the
 * card settles in its new column immediately, and restored if the request fails.
 */
export function useMoveLeadStage() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      write(async (db) => applyLeadPatch(db, { id, patch: { stageId } }, actorId)),
    onMutate: async ({ id, stageId }) => {
      return beginOptimisticListUpdate<Lead>(
        queryClient,
        queryKeys.leads.list(),
        (rows) => rows.map((row) => (row.id === id ? { ...row, stageId } : row)),
        write.signal,
      );
    },
    onError: (_error, _input, context) => {
      context?.rollback();
    },
    onSettled: async (lead, _error, _input, context) => {
      try {
        if (lead && !write.signal.aborted)
          queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
        return await Promise.all(
          AFTER_LEAD_CHANGE.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        );
      } finally {
        context?.release();
      }
    },
  });
}

export function useAddLeadNote() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: async ({ leadId, message }: { leadId: string; message: string }) =>
      write(async (db) => {
        const activity = await db.activities.create({
          entityType: 'lead',
          entityId: leadId,
          kind: 'note',
          message: message.trim(),
          actorId,
        });
        await db.leads.update(leadId, { lastActivityAt: activity.createdAt });
        return activity;
      }),
    onSettled: () =>
      Promise.all(
        [queryKeys.activities.all, queryKeys.leads.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Gives several leads a new owner at once, logging `reassigned` on each. */
export function useBulkAssignLeads() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const actorId = useCurrentUser().data?.id ?? null;

  return useMutation({
    mutationFn: async ({ leadIds, ownerId }: { leadIds: string[]; ownerId: string }) =>
      write(async (db) => {
        const [users, leads] = await Promise.all([db.users.list(), db.leads.list()]);
        const to = users.find((user) => user.id === ownerId);
        if (!to) throw new Error('Member not found.');
        const now = new Date().toISOString();
        let changed = 0;
        for (const id of leadIds) {
          const lead = leads.find((row) => row.id === id);
          if (!lead || lead.ownerId === to.id) continue;
          const from = users.find((user) => user.id === lead.ownerId);
          await db.leads.update(id, { ownerId: to.id, lastActivityAt: now });
          await db.activities.create({
            entityType: 'lead',
            entityId: id,
            kind: 'reassigned',
            message: `Reassigned from ${from?.name ?? 'unassigned'} to ${to.name}`,
            actorId,
          });
          changed += 1;
        }
        return { changed, owner: to };
      }),
    onSettled: () =>
      Promise.all(
        [queryKeys.leads.all, queryKeys.activities.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** Deletes a lead and everything that only makes sense with it: tasks, quotes, appointments, activity. */
export function useDeleteLead() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: string) => write((db) => deleteLead(db, leadId)),
    onSettled: () =>
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
