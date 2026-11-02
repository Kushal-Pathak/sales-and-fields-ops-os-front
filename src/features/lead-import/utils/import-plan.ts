import { env } from '@/lib/env';
import type { Priority } from '@/types/domain';
import { hasError, type ParsedRow } from './import-validation';

export type DuplicatePolicy = 'attach' | 'skip' | 'update';

export const DUPLICATE_POLICIES: { value: DuplicatePolicy; label: string; hint: string }[] = [
  {
    value: 'attach',
    label: 'Add a new lead to the existing contact',
    hint: `The row becomes another lead on the contact already in ${env.appName}.`,
  },
  {
    value: 'skip',
    label: 'Skip duplicate rows',
    hint: `Only rows that are not already in ${env.appName} are imported.`,
  },
  {
    value: 'update',
    label: 'Update the contact, then add the lead',
    hint: 'Non-empty values in the file overwrite the contact’s details.',
  },
];

export interface ImportSettings {
  pipelineId: string;
  stageId: string;
  source: string;
  ownerId: string;
  priority: Priority;
  followUp: { enabled: boolean; dueAt: string };
  duplicates: DuplicatePolicy;
}

export type PlanAction = 'create' | 'attach' | 'update' | 'skip';

export interface PlanItem {
  row: ParsedRow;
  action: PlanAction;
  /** For `attach` / `update`: the existing contact. For in-file repeats: the line whose contact to reuse. */
  contactId?: string;
  reuseLine?: number;
  reason?: string;
}

export interface ImportPlan {
  items: PlanItem[];
  counts: { create: number; attach: number; update: number; skip: number };
}

/** Decides what happens to every row. Pure: the runner just executes it. */
export function buildImportPlan(rows: ParsedRow[], settings: ImportSettings): ImportPlan {
  const counts = { create: 0, attach: 0, update: 0, skip: 0 };
  const items: PlanItem[] = rows.map((row) => {
    let item: PlanItem;
    if (hasError(row)) {
      const reason = row.issues.find((i) => i.level === 'error')?.message;
      item = { row, action: 'skip', ...(reason && { reason }) };
    } else if (row.sameAsLine !== undefined) {
      item = { row, action: 'attach', reuseLine: row.sameAsLine };
    } else if (row.match) {
      if (settings.duplicates === 'skip') {
        item = {
          row,
          action: 'skip',
          contactId: row.match.contactId,
          reason: `Already in ${env.appName}`,
        };
      } else {
        item = { row, action: settings.duplicates, contactId: row.match.contactId };
      }
    } else {
      item = { row, action: 'create' };
    }
    counts[item.action] += 1;
    return item;
  });
  return { items, counts };
}
