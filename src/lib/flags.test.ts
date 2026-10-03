import { describe, expect, it } from 'vitest';
import {
  expiredFlags,
  flagDefaults,
  FLAG_KEYS,
  FLAGS,
  isFlagKey,
  type FlagDefinition,
} from './flags';

describe('flag registry', () => {
  it('has no release flag past its removal date', () => {
    // Fails on purpose once a date passes: delete the flag and the code path it guarded.
    expect(expiredFlags(FLAGS)).toEqual([]);
  });

  it('gives every flag a default, a description and an owner', () => {
    expect(Object.keys(flagDefaults())).toEqual(FLAG_KEYS);
    for (const key of FLAG_KEYS) {
      expect(FLAGS[key].description.length).toBeGreaterThan(10);
      expect(FLAGS[key].owner).not.toBe('');
    }
  });

  it('recognises only declared keys', () => {
    expect(isFlagKey('assistant.ask')).toBe(true);
    expect(isFlagKey('toString')).toBe(false);
    expect(isFlagKey('quotes.unknown')).toBe(false);
  });
});

describe('expiredFlags', () => {
  const base = { description: 'A flag used by the test.', owner: 'test', default: false };
  const definitions: Record<string, FlagDefinition> = {
    'a.future': { ...base, kind: 'release', removeBy: '2026-12-01' },
    'b.past': { ...base, kind: 'release', removeBy: '2026-09-30' },
    'c.older': { ...base, kind: 'release', removeBy: '2026-01-15' },
    'd.today': { ...base, kind: 'release', removeBy: '2026-10-03' },
    'e.ops': { ...base, kind: 'ops' },
    'f.malformed': { ...base, kind: 'release', removeBy: 'soon' },
  };

  it('lists release flags past their date, oldest first, and never ops flags', () => {
    expect(expiredFlags(definitions, new Date('2026-10-03T12:00:00Z'))).toEqual([
      'c.older',
      'b.past',
      'f.malformed',
    ]);
  });
});
