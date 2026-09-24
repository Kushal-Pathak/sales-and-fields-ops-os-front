import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { autoMap } from './column-mapping';
import { normalizePhone, summarize, validateRows } from './import-validation';

const seed = buildSeed();
const refs = {
  contacts: seed.contacts,
  stages: seed.stages,
  users: seed.users,
  sources: seed.workspace[0]!.leadSources,
};
const existing = seed.contacts[0]!;
const owner = seed.users[1]!;
const headers = ['Name', 'Email', 'Phone', 'Value', 'Source', 'Priority', 'Stage', 'Owner'];
const mapping = autoMap(headers);

describe('import validation', () => {
  it('normalises phone numbers', () => {
    expect(normalizePhone('+1 (555) 010-0')).toBe('+15550100');
    expect(normalizePhone('555.0100')).toBe('5550100');
    expect(normalizePhone(undefined)).toBe('');
  });

  it('flags errors, warnings and assumptions per row', () => {
    const rows = validateRows(
      [
        ['Ada', 'ada@example.com', '', '12,000', 'Website', 'HIGH', 'Qualified', owner.email],
        ['', 'nobody@example.com', '', '', '', '', '', ''],
        ['Bob', 'not-an-email', '555', 'lots', 'Carrier pigeon', 'urgent', 'Nowhere', 'Ghost'],
        ['Cy', '', '', '', '', '', '', ''],
      ],
      mapping,
      refs,
    );
    expect(rows[0]!.issues).toEqual([]);
    expect(rows[0]!.lead).toMatchObject({
      value: 12000,
      source: 'Website',
      priority: 'high',
      ownerId: owner.id,
    });
    expect(rows[0]!.lead.stageId).toBe(seed.stages.find((s) => s.name === 'Qualified')!.id);

    expect(rows[1]!.issues).toEqual([{ level: 'error', message: 'Missing contact name' }]);

    const bob = rows[2]!;
    expect(bob.issues.some((i) => i.level === 'error' && i.message.includes('Invalid email'))).toBe(
      true,
    );
    expect(bob.issues.filter((i) => i.level === 'warning').map((i) => i.message)).toEqual([
      'Value “lots” is not a number; left empty',
      'Unknown source “Carrier pigeon”; default used',
      'Unknown priority “urgent”; default used',
      'Unknown stage “Nowhere”; default used',
      'Unknown owner “Ghost”; default used',
    ]);
    expect(rows[3]!.issues).toEqual([
      { level: 'warning', message: 'No phone or email to reach them' },
    ]);

    const summary = summarize(rows);
    expect(summary).toEqual({ total: 4, ready: 2, duplicates: 0, errors: 2, warnings: 1 });
  });

  it('matches existing contacts by email or phone and repeats within the file', () => {
    const rows = validateRows(
      [
        ['Someone', existing.email!.toUpperCase(), '', '', '', '', '', ''],
        ['Other', '', existing.phone!.replace(/\s/g, '-'), '', '', '', '', ''],
        ['New', 'new@example.com', '+1 555 9999', '', '', '', '', ''],
        ['New again', '', '(555) 9999', '', '', '', '', ''],
      ],
      mapping,
      refs,
    );
    expect(rows[0]!.match).toEqual({ contactId: existing.id, via: 'email' });
    expect(rows[1]!.match).toEqual({ contactId: existing.id, via: 'phone' });
    expect(rows[2]!.match).toBeUndefined();
    expect(rows[3]!.sameAsLine).toBeUndefined();
    const repeat = validateRows(
      [
        ['New', 'new@example.com', '+1 555 9999', '', '', '', '', ''],
        ['New again', '', '+1 (555) 9999', '', '', '', '', ''],
      ],
      mapping,
      refs,
    );
    expect(repeat[1]!.sameAsLine).toBe(1);
    expect(summarize(rows).duplicates).toBe(2);
  });
});
