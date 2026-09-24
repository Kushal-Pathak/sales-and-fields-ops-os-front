/**
 * Delimited-text parsing and writing (RFC 4180 style): quoted fields, doubled
 * quotes, CR/LF line endings, comma / tab / semicolon delimiters. No React, no domain.
 */

export type Delimiter = ',' | '\t' | ';';

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  delimiter: Delimiter;
}

const CANDIDATES: Delimiter[] = [',', '\t', ';'];

/** The delimiter that appears most in the first line, comma when tied or absent. */
export function detectDelimiter(text: string): Delimiter {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let best: Delimiter = ',';
  let bestCount = -1;
  for (const candidate of CANDIDATES) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function splitRecords(text: string, delimiter: Delimiter): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  while (i < text.length) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }
    if (char === '"' && field === '') {
      quoted = true;
      i += 1;
      continue;
    }
    if (char === delimiter) {
      record.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r' || char === '\n') {
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      i += char === '\r' && text[i + 1] === '\n' ? 2 : 1;
      continue;
    }
    field += char;
    i += 1;
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

/**
 * Parses the text into a header row and data rows. Blank lines are dropped and
 * every row is padded or trimmed to the header width. The BOM is ignored.
 */
export function parseDelimited(text: string, delimiter?: Delimiter): ParsedTable {
  const clean = text.replace(/^\uFEFF/, '');
  const used = delimiter ?? detectDelimiter(clean);
  const records = splitRecords(clean, used).filter((record) =>
    record.some((cell) => cell.trim() !== ''),
  );
  const headers = (records[0] ?? []).map((cell) => cell.trim());
  const rows = records.slice(1).map((record) => {
    const row = record.slice(0, headers.length).map((cell) => cell.trim());
    while (row.length < headers.length) row.push('');
    return row;
  });
  return { headers, rows, delimiter: used };
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Comma-separated text with a header row, quoting only where needed. */
export function serializeCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n') + '\r\n';
}
