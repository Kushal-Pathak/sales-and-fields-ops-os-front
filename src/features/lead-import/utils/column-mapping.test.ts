import { describe, expect, it } from 'vitest';
import { autoMap, emptyMapping, mappingIssues, sampleValue } from './column-mapping';

describe('column mapping', () => {
  it('guesses fields from header aliases, case and punctuation aside', () => {
    const mapping = autoMap([
      'Full Name',
      'E-mail',
      'Mobile Number',
      'Organisation',
      'Budget',
      'Assigned To',
      'Misc',
    ]);
    expect(mapping.name).toBe(0);
    expect(mapping.email).toBe(1);
    expect(mapping.phone).toBe(2);
    expect(mapping.company).toBe(3);
    expect(mapping.value).toBe(4);
    expect(mapping.owner).toBe(5);
    expect(mapping.notes).toBeNull();
  });

  it('never uses a column twice', () => {
    const mapping = autoMap(['Name', 'Name']);
    expect(mapping.name).toBe(0);
    expect(Object.values(mapping).filter((column) => column === 1)).toHaveLength(0);
  });

  it('reports a missing name and doubled columns', () => {
    expect(mappingIssues(emptyMapping())).toEqual(['Map the contact name; every row needs one.']);
    const doubled = { ...emptyMapping(), name: 0, phone: 1, email: 1 };
    expect(mappingIssues(doubled)).toEqual(['One column cannot feed both phone and email.']);
    expect(mappingIssues({ ...emptyMapping(), name: 0 })).toEqual([]);
  });

  it('samples the first non-empty value', () => {
    const rows = [
      ['', 'x'],
      ['Ada', 'y'],
    ];
    expect(sampleValue(rows, 0)).toBe('Ada');
    expect(sampleValue(rows, 1)).toBe('x');
    expect(sampleValue(rows, null)).toBe('');
  });
});
