import { formatDate } from '@/lib/format';
import type { CustomValues, FieldDefinition, FieldValue } from '@/types/domain';

export function sortFields(fields: FieldDefinition[]): FieldDefinition[] {
  return [...fields].sort((a, b) => a.order - b.order);
}

export function nextFieldOrder(
  fields: FieldDefinition[],
  entity: FieldDefinition['entity'],
): number {
  const own = fields.filter((field) => field.entity === entity);
  return own.length === 0 ? 0 : Math.max(...own.map((field) => field.order)) + 1;
}

/** Turns what an input holds (always a string or boolean) into the stored value, or `undefined` when blank. */
export function coerceValue(field: FieldDefinition, raw: string | boolean): FieldValue | undefined {
  if (field.type === 'checkbox') return raw === true || raw === 'true';
  if (typeof raw !== 'string') return undefined;
  const text = raw.trim();
  if (text === '') return undefined;
  if (field.type === 'number') {
    const number = Number(text);
    return Number.isFinite(number) ? number : undefined;
  }
  return text;
}

/** What an input should show for a stored value. */
export function toInputValue(
  field: FieldDefinition,
  value: FieldValue | undefined,
): string | boolean {
  if (field.type === 'checkbox') return value === true;
  if (value === undefined || value === null) return '';
  return String(value);
}

export type FieldErrors = Record<string, string>;

/** Required fields must be filled (a checkbox counts as filled when ticked); numbers must parse. */
export function validateValues(fields: FieldDefinition[], values: CustomValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of fields) {
    const value = values[field.key];
    const missing =
      value === undefined || value === '' || (field.type === 'checkbox' && value !== true);
    if (field.required && missing) errors[field.key] = `${field.label} is required.`;
    if (field.type === 'number' && value !== undefined && typeof value !== 'number') {
      errors[field.key] = 'Enter a number.';
    }
    if (
      field.type === 'select' &&
      typeof value === 'string' &&
      field.options &&
      !field.options.includes(value)
    ) {
      errors[field.key] = `Choose one of the options.`;
    }
  }
  return errors;
}

/** Drops blanks and keys that no longer have a definition. */
export function cleanValues(fields: FieldDefinition[], values: CustomValues): CustomValues {
  const keys = new Set(fields.map((field) => field.key));
  const clean: CustomValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (!keys.has(key) || value === undefined || value === '') continue;
    clean[key] = value;
  }
  return clean;
}

export function formatValue(
  field: FieldDefinition,
  value: FieldValue | undefined,
  locale?: string,
): string {
  if (value === undefined || value === '') return '';
  switch (field.type) {
    case 'checkbox':
      return value === true ? 'Yes' : 'No';
    case 'date':
      return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
        ? formatDate(new Date(`${value}T12:00:00`).toISOString(), 'date', locale)
        : String(value);
    case 'number':
      return typeof value === 'number' ? value.toLocaleString(locale) : String(value);
    default:
      return String(value);
  }
}
