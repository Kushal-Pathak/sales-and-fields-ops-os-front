import { IMPORT_FIELD_KEYS, IMPORT_FIELDS, type ImportFieldKey } from './import-fields';

/** Which file column (index) feeds each field; `null` means "do not import". */
export type Mapping = Record<ImportFieldKey, number | null>;

export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function emptyMapping(): Mapping {
  return Object.fromEntries(IMPORT_FIELD_KEYS.map((key) => [key, null])) as Mapping;
}

/** Guesses the mapping from header names; each column is used at most once. */
export function autoMap(headers: string[]): Mapping {
  const mapping = emptyMapping();
  const used = new Set<number>();
  const normalized = headers.map(normalizeHeader);
  for (const field of IMPORT_FIELDS) {
    const wanted = [field.key, ...field.aliases].map(normalizeHeader);
    const column = normalized.findIndex(
      (header, index) => !used.has(index) && wanted.includes(header),
    );
    if (column !== -1) {
      mapping[field.key] = column;
      used.add(column);
    }
  }
  return mapping;
}

/** Problems that block leaving the mapping step. */
export function mappingIssues(mapping: Mapping): string[] {
  const issues: string[] = [];
  if (mapping.name === null) issues.push('Map the contact name; every row needs one.');
  const seen = new Map<number, ImportFieldKey>();
  for (const key of IMPORT_FIELD_KEYS) {
    const column = mapping[key];
    if (column === null) continue;
    const other = seen.get(column);
    if (other !== undefined) {
      issues.push(`One column cannot feed both ${other} and ${key}.`);
    }
    seen.set(column, key);
  }
  return issues;
}

/** The first non-empty value in a column, for the "Sample" cell. */
export function sampleValue(rows: string[][], column: number | null): string {
  if (column === null) return '';
  for (const row of rows) {
    const value = row[column]?.trim();
    if (value) return value;
  }
  return '';
}
