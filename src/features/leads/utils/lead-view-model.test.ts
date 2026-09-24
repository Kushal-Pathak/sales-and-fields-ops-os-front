import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { DEFAULT_LEAD_FILTERS, LEAD_SORT_KEYS } from './lead-filters';
import {
  filterLeads,
  joinLeads,
  nextOpenStage,
  sortLeads,
  viewCounts,
  type LeadRow,
} from './lead-view-model';

const seed = buildSeed(new Date('2026-09-23T14:00:00'));
const rows = joinLeads(seed.leads, seed);
const me = seed.users[0]!.id;

describe('joinLeads', () => {
  it('resolves contact, owner and stage', () => {
    for (const row of rows) {
      expect(row.contact?.id).toBe(row.lead.contactId);
      expect(row.owner?.id).toBe(row.lead.ownerId);
      expect(row.stage?.id).toBe(row.lead.stageId);
    }
  });

  it('leaves missing references undefined instead of throwing', () => {
    const [row] = joinLeads([{ ...seed.leads[0]!, contactId: 'ghost' }], seed);
    expect(row?.contact).toBeUndefined();
    expect(row?.stage).toBeDefined();
  });
});

describe('filterLeads', () => {
  it('applies the saved views', () => {
    const counts = viewCounts(rows, me);
    expect(counts.all).toBe(rows.length);
    expect(filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, view: 'hot' }, me)).toHaveLength(
      counts.hot,
    );
    for (const row of filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, view: 'hot' }, me)) {
      expect(row.lead.priority).toBe('high');
      expect(row.stage?.kind).toBe('open');
    }
    for (const row of filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, view: 'mine' }, me)) {
      expect(row.lead.ownerId).toBe(me);
    }
    for (const row of filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, view: 'won' }, me)) {
      expect(row.stage?.kind).toBe('won');
    }
    expect(filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, view: 'mine' }, undefined)).toHaveLength(0);
  });

  it('searches contact name, company, phone, email and lead title', () => {
    const target = rows[0]!;
    const search = (q: string) => filterLeads(rows, { ...DEFAULT_LEAD_FILTERS, q }, me);
    expect(search(target.contact!.name.toUpperCase())).toContainEqual(target);
    expect(search(target.contact!.company!.slice(0, 6))).toContainEqual(target);
    expect(search(target.contact!.phone!)).toContainEqual(target);
    expect(search(target.lead.title.split(' ')[0]!)).toContainEqual(target);
    expect(search('zzz-no-such-lead')).toHaveLength(0);
  });

  it('narrows by stage, source, owner and priority', () => {
    const target = rows[3]!;
    const result = filterLeads(
      rows,
      {
        ...DEFAULT_LEAD_FILTERS,
        stageId: target.lead.stageId,
        source: target.lead.source,
        ownerId: target.lead.ownerId,
        priority: target.lead.priority,
      },
      me,
    );
    expect(result).toContainEqual(target);
    for (const row of result) {
      expect(row.lead.stageId).toBe(target.lead.stageId);
      expect(row.lead.source).toBe(target.lead.source);
      expect(row.lead.ownerId).toBe(target.lead.ownerId);
      expect(row.lead.priority).toBe(target.lead.priority);
    }
  });
});

describe('sortLeads', () => {
  const isSorted = <T>(items: T[], key: (item: T) => number | string, desc = false) =>
    items.every((item, i) => {
      if (i === 0) return true;
      const a = key(items[i - 1]!);
      const b = key(item);
      return desc ? a >= b : a <= b;
    });

  it('sorts by each key in both directions', () => {
    const keys: Record<string, (row: LeadRow) => number | string> = {
      activity: (r) => r.lead.lastActivityAt,
      created: (r) => r.lead.createdAt,
      value: (r) => r.lead.value ?? 0,
      priority: (r) => ({ high: 2, medium: 1, low: 0 })[r.lead.priority],
      name: (r) => r.contact?.name ?? '',
    };
    for (const key of LEAD_SORT_KEYS) {
      const pick = keys[key]!;
      expect(isSorted(sortLeads(rows, { key, direction: 'asc' }), pick), key).toBe(true);
      expect(isSorted(sortLeads(rows, { key, direction: 'desc' }), pick, true), key).toBe(true);
    }
  });

  it('does not mutate the input', () => {
    const copy = [...rows];
    sortLeads(rows, { key: 'name', direction: 'asc' });
    expect(rows).toEqual(copy);
  });
});

describe('nextOpenStage', () => {
  const stages = seed.stages;
  it('moves to the following stage and stops at the last open one', () => {
    expect(nextOpenStage(stages[0], stages)?.id).toBe(stages[1]!.id);
    const lastOpen = stages.filter((s) => s.kind === 'open').at(-1);
    expect(nextOpenStage(lastOpen, stages)?.kind).toBe('won');
    expect(
      nextOpenStage(
        stages.find((s) => s.kind === 'won'),
        stages,
      ),
    ).toBeUndefined();
    expect(nextOpenStage(undefined, stages)).toBeUndefined();
  });
});
