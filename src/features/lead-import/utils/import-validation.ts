import type { Contact, Priority, Stage, User } from '@/types/domain';
import type { Mapping } from './column-mapping';

export interface RowIssue {
  level: 'error' | 'warning';
  message: string;
}

export interface ParsedContact {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
}

export interface ParsedLead {
  title?: string;
  value?: number;
  source?: string;
  priority?: Priority;
  stageId?: string;
  ownerId?: string;
  notes?: string;
}

export interface ParsedRow {
  /** 1-based data row number, as the user sees it in the file (header excluded). */
  line: number;
  raw: string[];
  contact: ParsedContact;
  lead: ParsedLead;
  issues: RowIssue[];
  /** An existing contact this row matches. */
  match?: { contactId: string; via: 'email' | 'phone' };
  /** An earlier row in the file that describes the same person. */
  sameAsLine?: number;
}

export interface ValidationRefs {
  contacts: Contact[];
  stages: Stage[];
  users: User[];
  sources: string[];
}

export function normalizePhone(value: string | undefined): string {
  if (!value) return '';
  const digits = value.replace(/[^\d+]/g, '');
  const plus = digits.startsWith('+') ? '+' : '';
  return plus + digits.replace(/\D/g, '');
}

export function normalizeEmail(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

function cell(row: string[], column: number | null): string {
  return column === null ? '' : (row[column] ?? '').trim();
}

function parseValue(text: string): number | undefined {
  if (!text) return undefined;
  const number = Number(text.replace(/[^\d.-]/g, ''));
  return Number.isFinite(number) && /\d/.test(text) ? number : undefined;
}

/**
 * Turns file rows into contacts and leads, collecting what is wrong or assumed.
 * Rows with an `error` are skipped by the import; warnings still import.
 */
export function validateRows(
  rows: string[][],
  mapping: Mapping,
  refs: ValidationRefs,
): ParsedRow[] {
  const byEmail = new Map<string, Contact>();
  const byPhone = new Map<string, Contact>();
  for (const contact of refs.contacts) {
    const email = normalizeEmail(contact.email);
    const phone = normalizePhone(contact.phone);
    if (email) byEmail.set(email, contact);
    if (phone) byPhone.set(phone, contact);
  }
  const stageByName = new Map(refs.stages.map((stage) => [stage.name.toLowerCase(), stage]));
  const userByKey = new Map<string, User>();
  for (const user of refs.users) {
    userByKey.set(user.name.toLowerCase(), user);
    userByKey.set(user.email.toLowerCase(), user);
  }
  const sourceByKey = new Map(refs.sources.map((source) => [source.toLowerCase(), source]));
  const seenEmail = new Map<string, number>();
  const seenPhone = new Map<string, number>();

  return rows.map((raw, index) => {
    const line = index + 1;
    const issues: RowIssue[] = [];
    const name = cell(raw, mapping.name);
    const phone = cell(raw, mapping.phone);
    const email = cell(raw, mapping.email);
    const company = cell(raw, mapping.company);
    const address = cell(raw, mapping.address);

    if (!name) issues.push({ level: 'error', message: 'Missing contact name' });
    if (email && !EMAIL_PATTERN.test(email)) {
      issues.push({ level: 'error', message: `Invalid email “${email}”` });
    }
    if (!phone && !email) {
      issues.push({ level: 'warning', message: 'No phone or email to reach them' });
    }

    const contact: ParsedContact = {
      name,
      ...(phone && { phone }),
      ...(email && { email }),
      ...(company && { company }),
      ...(address && { address }),
    };

    const lead: ParsedLead = {};
    const title = cell(raw, mapping.title);
    if (title) lead.title = title;
    const valueText = cell(raw, mapping.value);
    if (valueText) {
      const value = parseValue(valueText);
      if (value === undefined) {
        issues.push({
          level: 'warning',
          message: `Value “${valueText}” is not a number; left empty`,
        });
      } else {
        lead.value = value;
      }
    }
    const source = cell(raw, mapping.source);
    if (source) {
      const known = sourceByKey.get(source.toLowerCase());
      if (known) lead.source = known;
      else issues.push({ level: 'warning', message: `Unknown source “${source}”; default used` });
    }
    const priority = cell(raw, mapping.priority).toLowerCase();
    if (priority) {
      if ((PRIORITIES as string[]).includes(priority)) lead.priority = priority as Priority;
      else
        issues.push({ level: 'warning', message: `Unknown priority “${priority}”; default used` });
    }
    const stage = cell(raw, mapping.stage);
    if (stage) {
      const known = stageByName.get(stage.toLowerCase());
      if (known) lead.stageId = known.id;
      else issues.push({ level: 'warning', message: `Unknown stage “${stage}”; default used` });
    }
    const owner = cell(raw, mapping.owner);
    if (owner) {
      const known = userByKey.get(owner.toLowerCase());
      if (known) lead.ownerId = known.id;
      else issues.push({ level: 'warning', message: `Unknown owner “${owner}”; default used` });
    }
    const notes = cell(raw, mapping.notes);
    if (notes) lead.notes = notes;

    const parsed: ParsedRow = { line, raw, contact, lead, issues };
    const hasError = issues.some((issue) => issue.level === 'error');
    if (hasError) return parsed;

    const emailKey = normalizeEmail(email);
    const phoneKey = normalizePhone(phone);
    const earlier = (emailKey && seenEmail.get(emailKey)) || (phoneKey && seenPhone.get(phoneKey));
    if (earlier) {
      parsed.sameAsLine = earlier;
      issues.push({
        level: 'warning',
        message: `Same person as row ${earlier}; the lead is added to that contact`,
      });
    } else {
      const matched = (emailKey && byEmail.get(emailKey)) || (phoneKey && byPhone.get(phoneKey));
      if (matched) {
        parsed.match = {
          contactId: matched.id,
          via: emailKey && byEmail.get(emailKey) ? 'email' : 'phone',
        };
      }
    }
    if (emailKey && !seenEmail.has(emailKey)) seenEmail.set(emailKey, line);
    if (phoneKey && !seenPhone.has(phoneKey)) seenPhone.set(phoneKey, line);
    return parsed;
  });
}

export interface ValidationSummary {
  total: number;
  ready: number;
  duplicates: number;
  errors: number;
  warnings: number;
}

export function hasError(row: ParsedRow): boolean {
  return row.issues.some((issue) => issue.level === 'error');
}

export function summarize(rows: ParsedRow[]): ValidationSummary {
  const errors = rows.filter(hasError).length;
  const duplicates = rows.filter((row) => !hasError(row) && row.match).length;
  const warnings = rows.filter(
    (row) => !hasError(row) && row.issues.some((issue) => issue.level === 'warning'),
  ).length;
  return { total: rows.length, ready: rows.length - errors, duplicates, errors, warnings };
}
