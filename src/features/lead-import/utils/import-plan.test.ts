import { describe, expect, it } from 'vitest';
import { buildImportPlan, type ImportSettings } from './import-plan';
import type { ParsedRow } from './import-validation';

function row(line: number, extra: Partial<ParsedRow> = {}): ParsedRow {
  return { line, raw: [], contact: { name: `Row ${line}` }, lead: {}, issues: [], ...extra };
}

const settings: ImportSettings = {
  pipelineId: 'pipe',
  stageId: 'stage',
  source: 'Import',
  ownerId: 'usr-1',
  priority: 'medium',
  followUp: { enabled: false, dueAt: '' },
  duplicates: 'attach',
};

const rows: ParsedRow[] = [
  row(1),
  row(2, { issues: [{ level: 'error', message: 'Missing contact name' }] }),
  row(3, { match: { contactId: 'con-1', via: 'email' } }),
  row(4, { sameAsLine: 1 }),
];

describe('import plan', () => {
  it('attaches matches by default and skips error rows', () => {
    const plan = buildImportPlan(rows, settings);
    expect(plan.items.map((item) => item.action)).toEqual(['create', 'skip', 'attach', 'attach']);
    expect(plan.items[2]!.contactId).toBe('con-1');
    expect(plan.items[3]!.reuseLine).toBe(1);
    expect(plan.items[1]!.reason).toBe('Missing contact name');
    expect(plan.counts).toEqual({ create: 1, attach: 2, update: 0, skip: 1 });
  });

  it('honours the skip and update policies', () => {
    expect(buildImportPlan(rows, { ...settings, duplicates: 'skip' }).items[2]).toMatchObject({
      action: 'skip',
      contactId: 'con-1',
      reason: 'Already in Pilot CRM',
    });
    expect(buildImportPlan(rows, { ...settings, duplicates: 'update' }).items[2]).toMatchObject({
      action: 'update',
      contactId: 'con-1',
    });
  });
});
