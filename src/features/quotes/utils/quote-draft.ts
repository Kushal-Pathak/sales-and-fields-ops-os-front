import {
  quoteTotals,
  type CreateInput,
  type Quote,
  type QuoteLineItem,
  type QuoteTotals,
  type Workspace,
} from '@/types/domain';

/**
 * The builder's form model. Numbers are kept as strings while the user types so
 * partial input ("12.") is not rewritten under them; totals parse on the fly.
 */

export interface DraftItem {
  id: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
}

export interface QuoteDraft {
  leadId: string | null;
  items: DraftItem[];
  discountPct: string;
  taxRatePct: string;
  /** `YYYY-MM-DD` for the date input; empty means no expiry. */
  validUntil: string;
  notes: string;
  terms: string;
}

export interface ItemErrors {
  description?: string;
  quantity?: string;
  unitPrice?: string;
  discountPct?: string;
}

export interface DraftErrors {
  leadId?: string;
  items?: string;
  itemErrors: Record<string, ItemErrors>;
  discountPct?: string;
  taxRatePct?: string;
  validUntil?: string;
}

export const VALID_FOR_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function numberInput(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function emptyItem(id: string): DraftItem {
  return { id, description: '', unit: '', quantity: '1', unitPrice: '', discountPct: '' };
}

/** A fresh draft with the workspace defaults; `newItemId` supplies the first line's id. */
export function newDraft(
  workspace: Pick<Workspace, 'taxRatePct' | 'quoteTerms'>,
  leadId: string | null,
  newItemId: () => string,
  now: Date = new Date(),
): QuoteDraft {
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + VALID_FOR_DAYS);
  return {
    leadId,
    items: [emptyItem(newItemId())],
    discountPct: '0',
    taxRatePct: String(workspace.taxRatePct),
    validUntil: toDateInput(validUntil.toISOString()),
    notes: '',
    terms: workspace.quoteTerms ?? '',
  };
}

export function draftFromQuote(quote: Quote): QuoteDraft {
  return {
    leadId: quote.leadId,
    items: quote.items.map((item) => ({
      id: item.id,
      description: item.description,
      unit: item.unit ?? '',
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      discountPct: numberInput(item.discountPct),
    })),
    discountPct: String(quote.discountPct),
    taxRatePct: String(quote.taxRatePct),
    validUntil: toDateInput(quote.validUntil),
    notes: quote.notes ?? '',
    terms: quote.terms ?? '',
  };
}

/** Parses a numeric input; blank counts as 0, anything unparsable as NaN. */
export function parseNumber(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  return Number(trimmed);
}

function isPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

/** The items that count: at least a description or a price was typed. */
export function meaningfulItems(items: DraftItem[]): DraftItem[] {
  return items.filter((item) => item.description.trim() !== '' || item.unitPrice.trim() !== '');
}

export function draftTotals(draft: QuoteDraft): QuoteTotals {
  const items = meaningfulItems(draft.items).map((item) => ({
    quantity: parseNumber(item.quantity),
    unitPrice: parseNumber(item.unitPrice),
    discountPct: parseNumber(item.discountPct),
  }));
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  return quoteTotals({
    items: items.map((item) => ({
      quantity: safe(item.quantity),
      unitPrice: safe(item.unitPrice),
      discountPct: safe(item.discountPct),
    })),
    discountPct: safe(parseNumber(draft.discountPct)),
    taxRatePct: safe(parseNumber(draft.taxRatePct)),
  });
}

export function lineAmount(item: DraftItem): number {
  const quantity = parseNumber(item.quantity);
  const unitPrice = parseNumber(item.unitPrice);
  const discount = parseNumber(item.discountPct);
  const amount = quantity * unitPrice * (1 - (Number.isFinite(discount) ? discount : 0) / 100);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function validateDraft(draft: QuoteDraft): DraftErrors {
  const errors: DraftErrors = { itemErrors: {} };
  if (!draft.leadId) errors.leadId = 'Choose the lead this quote is for.';

  const items = meaningfulItems(draft.items);
  if (items.length === 0) errors.items = 'Add at least one line item.';
  for (const item of items) {
    const itemErrors: ItemErrors = {};
    if (!item.description.trim()) itemErrors.description = 'Describe the item.';
    const quantity = parseNumber(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) itemErrors.quantity = 'More than 0.';
    const unitPrice = parseNumber(item.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) itemErrors.unitPrice = 'A price.';
    if (!isPercent(parseNumber(item.discountPct))) itemErrors.discountPct = '0–100.';
    if (Object.keys(itemErrors).length > 0) errors.itemErrors[item.id] = itemErrors;
  }

  if (!isPercent(parseNumber(draft.discountPct))) errors.discountPct = 'Enter 0 to 100.';
  if (!isPercent(parseNumber(draft.taxRatePct))) errors.taxRatePct = 'Enter 0 to 100.';
  if (draft.validUntil && Number.isNaN(new Date(`${draft.validUntil}T00:00:00`).getTime())) {
    errors.validUntil = 'Choose a valid date.';
  }
  return errors;
}

export function hasDraftErrors(errors: DraftErrors): boolean {
  return (
    Boolean(errors.leadId || errors.items || errors.discountPct || errors.taxRatePct) ||
    Boolean(errors.validUntil) ||
    Object.keys(errors.itemErrors).length > 0
  );
}

/** The persisted fields a valid draft produces; the caller adds number, contact, creator, status. */
export type QuoteDraftInput = Pick<
  CreateInput<Quote>,
  'leadId' | 'items' | 'discountPct' | 'taxRatePct' | 'notes' | 'terms' | 'validUntil' | 'currency'
>;

export function draftToInput(draft: QuoteDraft, currency: string): QuoteDraftInput {
  if (!draft.leadId) throw new Error('A quote needs a lead.');
  const items: QuoteLineItem[] = meaningfulItems(draft.items).map((item) => {
    const unit = item.unit.trim();
    const discountPct = parseNumber(item.discountPct);
    return {
      id: item.id,
      description: item.description.trim(),
      quantity: parseNumber(item.quantity),
      unitPrice: parseNumber(item.unitPrice),
      ...(unit && { unit }),
      ...(discountPct > 0 && { discountPct }),
    };
  });
  const notes = draft.notes.trim();
  const terms = draft.terms.trim();
  return {
    leadId: draft.leadId,
    currency,
    items,
    discountPct: parseNumber(draft.discountPct),
    taxRatePct: parseNumber(draft.taxRatePct),
    ...(notes && { notes }),
    ...(terms && { terms }),
    ...(draft.validUntil && {
      validUntil: new Date(`${draft.validUntil}T23:59:59`).toISOString(),
    }),
  };
}

const NUMBER_PATTERN = /^Q-(\d+)$/;
const FIRST_NUMBER = 1001;

/** The next `Q-<n>` after the highest number in use. */
export function nextQuoteNumber(quotes: Pick<Quote, 'number'>[]): string {
  let highest = FIRST_NUMBER - 1;
  for (const quote of quotes) {
    const match = NUMBER_PATTERN.exec(quote.number);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `Q-${highest + 1}`;
}
