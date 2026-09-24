import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseDelimited, serializeCsv } from './csv';

describe('csv', () => {
  it('parses quoted fields, doubled quotes and CRLF', () => {
    const text = 'Name,Company,Notes\r\n"Doe, Jane","Acme ""Inc""",Hi\r\nBob,,\r\n';
    const table = parseDelimited(text);
    expect(table.delimiter).toBe(',');
    expect(table.headers).toEqual(['Name', 'Company', 'Notes']);
    expect(table.rows).toEqual([
      ['Doe, Jane', 'Acme "Inc"', 'Hi'],
      ['Bob', '', ''],
    ]);
  });

  it('detects tabs and semicolons and pads short rows', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
    const table = parseDelimited('Name\tPhone\nAda\t123\nBob\n');
    expect(table.delimiter).toBe('\t');
    expect(table.rows).toEqual([
      ['Ada', '123'],
      ['Bob', ''],
    ]);
  });

  it('ignores a BOM, blank lines and extra cells', () => {
    const table = parseDelimited('﻿Name,Email\n\nAda,ada@example.com,extra\n   \n');
    expect(table.headers).toEqual(['Name', 'Email']);
    expect(table.rows).toEqual([['Ada', 'ada@example.com']]);
    expect(parseDelimited('').headers).toEqual([]);
  });

  it('round-trips through serialize', () => {
    const headers = ['Name', 'Notes'];
    const rows = [
      ['Doe, Jane', 'Said "hi"'],
      ['Bob', 'multi\nline'],
    ];
    expect(parseDelimited(serializeCsv(headers, rows))).toMatchObject({ headers, rows });
  });
});
