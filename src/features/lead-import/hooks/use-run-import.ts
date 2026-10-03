import { useWriteOperation } from '@/hooks/use-write-operation';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import { AccessRevokedError, isAbortError, SessionChangedError } from '@/data/errors';
import { AUTOMATION_EFFECT_KEYS, runAutomations } from '@/features/automations';
import type { Contact, UpdateInput } from '@/types/domain';
import type { ImportPlan, ImportSettings } from '../utils/import-plan';
import type { ParsedRow } from '../utils/import-validation';

export interface RunProgress {
  done: number;
  total: number;
  phase: string;
}

export interface ImportResult {
  leadsCreated: number;
  contactsCreated: number;
  contactsMatched: number;
  contactsUpdated: number;
  tasksCreated: number;
  skipped: number;
  failed: number;
  /** Rows that were not imported, for the download. */
  skippedRows: { row: ParsedRow; reason: string }[];
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Executes an `ImportPlan` row by row against `db`, reporting progress. Each row
 * creates or reuses a contact, creates the lead with a `created` activity, and
 * optionally a follow-up task. Failures are counted, never thrown.
 */
export function useRunImport() {
  const write = useWriteOperation('leads');
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<RunProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      plan,
      settings,
      actorId,
    }: {
      plan: ImportPlan;
      settings: ImportSettings;
      actorId: string;
    }): Promise<ImportResult> =>
      write(async (db) => {
        const result: ImportResult = {
          leadsCreated: 0,
          contactsCreated: 0,
          contactsMatched: 0,
          contactsUpdated: 0,
          tasksCreated: 0,
          skipped: 0,
          failed: 0,
          skippedRows: [],
        };
        const contactByLine = new Map<number, string>();
        const total = plan.items.length;
        setProgress({ done: 0, total, phase: 'Starting' });

        for (const [index, item] of plan.items.entries()) {
          write.signal.throwIfAborted();
          const { row } = item;
          setProgress({
            done: index,
            total,
            phase: `Importing row ${row.line}: ${row.contact.name}`,
          });
          await yieldToUi();
          if (item.action === 'skip') {
            result.skipped += 1;
            result.skippedRows.push({ row, reason: item.reason ?? 'Skipped' });
            continue;
          }
          try {
            let contactId: string;
            if (item.action === 'create') {
              contactId = (await db.contacts.create(row.contact)).id;
              result.contactsCreated += 1;
            } else if (item.reuseLine !== undefined) {
              const reused = contactByLine.get(item.reuseLine);
              if (!reused) throw new Error(`Row ${item.reuseLine} was not imported`);
              contactId = reused;
            } else {
              contactId = item.contactId!;
              result.contactsMatched += 1;
              if (item.action === 'update') {
                const patch: UpdateInput<Contact> = {};
                if (row.contact.phone) patch.phone = row.contact.phone;
                if (row.contact.email) patch.email = row.contact.email;
                if (row.contact.company) patch.company = row.contact.company;
                if (row.contact.address) patch.address = row.contact.address;
                if (Object.keys(patch).length > 0) {
                  await db.contacts.update(contactId, patch);
                  result.contactsUpdated += 1;
                }
              }
            }
            contactByLine.set(row.line, contactId);

            const now = new Date().toISOString();
            const source = row.lead.source ?? settings.source;
            const priority = row.lead.priority ?? settings.priority;
            const ownerId = row.lead.ownerId ?? settings.ownerId;
            const lead = await db.leads.create({
              contactId,
              title: row.lead.title ?? row.contact.company ?? row.contact.name,
              pipelineId: settings.pipelineId,
              stageId: row.lead.stageId ?? settings.stageId,
              ownerId,
              source,
              priority,
              ...(row.lead.value !== undefined && { value: row.lead.value }),
              ...(row.lead.notes && { notes: row.lead.notes }),
              ...(settings.followUp.enabled && {
                nextAction: 'Follow-up call',
                nextActionAt: settings.followUp.dueAt,
              }),
              lastActivityAt: now,
            });
            result.leadsCreated += 1;
            await db.activities.create({
              entityType: 'lead',
              entityId: lead.id,
              kind: 'created',
              message: `Lead imported from ${source}`,
              actorId,
            });
            if (settings.followUp.enabled) {
              await db.tasks.create({
                title: `Follow up with ${row.contact.name}`,
                type: 'call',
                leadId: lead.id,
                contactId,
                assigneeId: ownerId,
                dueAt: settings.followUp.dueAt,
                priority,
                status: 'pending',
              });
              result.tasksCreated += 1;
            }
            await runAutomations({ type: 'lead_created', lead }, actorId, db);
          } catch (error) {
            if (
              error instanceof SessionChangedError ||
              error instanceof AccessRevokedError ||
              isAbortError(error)
            )
              throw error;
            result.failed += 1;
            result.skippedRows.push({
              row,
              reason: error instanceof Error ? error.message : 'Could not be imported',
            });
          }
        }
        setProgress({ done: total, total, phase: 'Done' });
        return result;
      }),
    onSettled: () =>
      Promise.all(
        [queryKeys.contacts.all, ...AUTOMATION_EFFECT_KEYS].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });

  return {
    run: mutation.mutate,
    reset: () => {
      mutation.reset();
      setProgress(null);
    },
    result: mutation.data,
    error: mutation.error,
    isPending: mutation.isPending,
    progress,
  };
}
