import { QueryContent } from '@/components/common/query-content';
import { getQueryError } from '@/data/query-state';
import { PartialWriteError } from '@/data/errors';
import { useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeftIcon, LockIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import type { Quote, Workspace } from '@/types/domain';
import { useQuote } from '../hooks/use-quote';
import { useCreateQuote, useUpdateQuote } from '../hooks/use-quote-mutations';
import { useLeadOptions, type LeadOption } from '../hooks/use-quotes';
import {
  draftFromQuote,
  draftToInput,
  draftTotals,
  emptyItem,
  hasDraftErrors,
  newDraft,
  validateDraft,
  type DraftErrors,
  type DraftItem,
  type QuoteDraft,
} from '../utils/quote-draft';
import { isQuoteEditable } from '../utils/quote-workflow';
import { LineItemsEditor } from './line-items-editor';
import { QuoteStatusBadge, QuoteTotals } from './quote-fields';

interface QuoteBuilderProps {
  /** When set, edits this quote (drafts only); otherwise creates one. */
  quoteId?: string | undefined;
  /** Lead preselected for a new quote (from the lead drawer). */
  defaultLeadId?: string | null | undefined;
}

/**
 * The full-page quote builder: line items and terms on the left, a live summary
 * rail on the right. It manages its own layout inside `<main>` (no PageHeader/PageBody).
 */
export function QuoteBuilder({ quoteId, defaultLeadId = null }: QuoteBuilderProps) {
  const workspace = useWorkspace();
  const existing = useQuote(quoteId ?? null);
  const error = getQueryError([workspace, existing]);
  let content: ReactNode;
  if (existing.notFound) {
    content = (
      <EmptyState
        icon={LockIcon}
        title="This quote no longer exists"
        hint="It may have been deleted."
        action={<BackToQuotes />}
      />
    );
  } else if (!workspace.data || (quoteId && !existing.row)) {
    content = <BuilderSkeleton />;
  } else {
    const quote = existing.row?.quote;
    content =
      quote && !isQuoteEditable(quote.status) ? (
        <EmptyState
          icon={LockIcon}
          title={`${quote.number} can no longer be edited`}
          hint="Only drafts can be changed. Ask for a revision to return it to draft, or duplicate it."
          action={
            <Button
              size="sm"
              nativeButton={false}
              render={<Link to={`/quotes?quote=${quote.id}`} />}
            >
              Open the quote
            </Button>
          }
        />
      ) : (
        <BuilderForm
          key={quote?.id ?? 'new'}
          workspace={workspace.data}
          quote={quote}
          defaultLeadId={defaultLeadId}
        />
      );
  }
  return (
    <QueryContent
      error={error}
      hasData={Boolean(workspace.data && (!quoteId || existing.row))}
      title="Quote builder could not be loaded"
      onRetry={() => void Promise.all([workspace.refetch(), existing.refetch()])}
    >
      {content}
    </QueryContent>
  );
}

function BackToQuotes() {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/quotes" />}>
      Back to quotes
    </Button>
  );
}

function BuilderSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-9 w-full max-w-lg" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

const newItemId = () => crypto.randomUUID();

function BuilderForm({
  workspace,
  quote,
  defaultLeadId,
}: {
  workspace: Workspace;
  quote: Quote | undefined;
  defaultLeadId: string | null;
}) {
  const navigate = useNavigate();
  const leadOptions = useLeadOptions() ?? [];
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const [draft, setDraft] = useState<QuoteDraft>(() =>
    quote ? draftFromQuote(quote) : newDraft(workspace, defaultLeadId, newItemId),
  );
  const [errors, setErrors] = useState<DraftErrors>({ itemErrors: {} });

  const currency = quote?.currency ?? workspace.currency;
  const locale = workspace.locale;
  const totals = draftTotals(draft);
  const lead = leadOptions.find((option) => option.lead.id === draft.leadId) ?? null;
  const isPending = createQuote.isPending || updateQuote.isPending;
  const saveError = createQuote.error ?? updateQuote.error;

  const patch = (next: Partial<QuoteDraft>) => setDraft((prev) => ({ ...prev, ...next }));
  const patchItem = (id: string, next: Partial<DraftItem>) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, ...next } : item)),
    }));
  const addItem = () =>
    setDraft((prev) => ({ ...prev, items: [...prev.items, emptyItem(newItemId())] }));
  const removeItem = (id: string) =>
    setDraft((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));

  const save = (submit: boolean) => {
    const next = validateDraft(draft);
    setErrors(next);
    if (hasDraftErrors(next)) return;
    const input = draftToInput(draft, currency);
    const done = (saved: Quote) => navigate(`/quotes?quote=${saved.id}`);
    if (quote) {
      // Lead and currency are fixed once a quote exists; optional fields clear when blank.
      updateQuote.mutate(
        {
          id: quote.id,
          patch: {
            items: input.items,
            discountPct: input.discountPct,
            taxRatePct: input.taxRatePct,
            notes: input.notes,
            terms: input.terms,
            validUntil: input.validUntil,
          },
          submit,
        },
        { onSuccess: done },
      );
      return;
    }
    createQuote.mutate({ draft: input, submit }, { onSuccess: done });
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save(false);
  };

  const leadLabel = (option: LeadOption) =>
    `${option.contact?.name ?? 'Unknown'} · ${option.lead.title}`;

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      aria-label={quote ? `Edit ${quote.number}` : 'New quote'}
    >
      <div className="flex flex-none flex-wrap items-center gap-3 border-b px-4 py-2.5">
        <Link
          to={quote ? `/quotes?quote=${quote.id}` : '/quotes'}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" /> Quotes
        </Link>
        <span className="text-foreground-faint">/</span>
        <h1 className="text-lg font-bold">{quote ? quote.number : 'New quote'}</h1>
        <QuoteStatusBadge status="draft" />
        {lead && (
          <p className="ml-auto truncate text-sm text-muted-foreground">
            Customer <b className="font-semibold text-foreground">{lead.contact?.name}</b>
            <span className="mx-2">·</span>
            Lead <b className="font-semibold text-foreground">{lead.lead.title}</b>
          </p>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:overflow-hidden">
        <div className="flex flex-1 flex-col gap-5 p-4 lg:overflow-y-auto">
          <Field data-invalid={errors.leadId ? true : undefined} className="max-w-lg">
            <FieldLabel htmlFor="quote-lead">Lead</FieldLabel>
            <Combobox
              items={leadOptions}
              value={lead}
              disabled={Boolean(quote)}
              onValueChange={(next: LeadOption | null) => patch({ leadId: next?.lead.id ?? null })}
              itemToStringLabel={leadLabel}
              isItemEqualToValue={(a: LeadOption, b: LeadOption) => a.lead.id === b.lead.id}
            >
              <ComboboxInput
                id="quote-lead"
                placeholder="Choose a lead"
                className="w-full"
                showClear={!quote}
                aria-invalid={errors.leadId ? true : undefined}
              />
              <ComboboxContent>
                <ComboboxEmpty>No leads found.</ComboboxEmpty>
                <ComboboxList>
                  {(option: LeadOption) => (
                    <ComboboxItem key={option.lead.id} value={option}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.contact?.name ?? 'Unknown'}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {option.lead.title}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError>{errors.leadId}</FieldError>
          </Field>

          <section className="flex flex-col gap-2">
            <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
              Line items
            </h2>
            <LineItemsEditor
              items={draft.items}
              errors={errors.itemErrors}
              currency={currency}
              onChange={patchItem}
              onAdd={addItem}
              onRemove={removeItem}
            />
            {errors.items && (
              <p role="alert" className="text-sm text-destructive">
                {errors.items}
              </p>
            )}
          </section>

          <div className="grid max-w-lg grid-cols-3 gap-3">
            <Field data-invalid={errors.discountPct ? true : undefined}>
              <FieldLabel htmlFor="quote-discount">Discount %</FieldLabel>
              <Input
                id="quote-discount"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={draft.discountPct}
                onChange={(event) => patch({ discountPct: event.target.value })}
                aria-invalid={errors.discountPct ? true : undefined}
              />
              <FieldError>{errors.discountPct}</FieldError>
            </Field>
            <Field data-invalid={errors.taxRatePct ? true : undefined}>
              <FieldLabel htmlFor="quote-tax">Tax %</FieldLabel>
              <Input
                id="quote-tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={draft.taxRatePct}
                onChange={(event) => patch({ taxRatePct: event.target.value })}
                aria-invalid={errors.taxRatePct ? true : undefined}
              />
              <FieldError>{errors.taxRatePct}</FieldError>
            </Field>
            <Field data-invalid={errors.validUntil ? true : undefined}>
              <FieldLabel htmlFor="quote-valid">Valid until</FieldLabel>
              <Input
                id="quote-valid"
                type="date"
                value={draft.validUntil}
                onChange={(event) => patch({ validUntil: event.target.value })}
                aria-invalid={errors.validUntil ? true : undefined}
              />
              <FieldError>{errors.validUntil}</FieldError>
            </Field>
          </div>

          <Field className="max-w-2xl">
            <FieldLabel htmlFor="quote-notes">Notes</FieldLabel>
            <Textarea
              id="quote-notes"
              rows={3}
              placeholder="Assumptions, scope or anything the customer should know."
              value={draft.notes}
              onChange={(event) => patch({ notes: event.target.value })}
            />
          </Field>
          <Field className="max-w-2xl">
            <FieldLabel htmlFor="quote-terms">Terms and conditions</FieldLabel>
            <Textarea
              id="quote-terms"
              rows={4}
              value={draft.terms}
              onChange={(event) => patch({ terms: event.target.value })}
            />
          </Field>
        </div>

        <aside className="flex w-full flex-none flex-col gap-4 border-t bg-surface-2/40 p-4 lg:w-80 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Summary
          </h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            <SummaryRow label="Customer">{lead?.contact?.name ?? '—'}</SummaryRow>
            <SummaryRow label="Lead">{lead?.lead.title ?? '—'}</SummaryRow>
            <SummaryRow label="Quote date">
              {formatDate(quote?.createdAt ?? new Date().toISOString(), 'date', locale)}
            </SummaryRow>
            <SummaryRow label="Valid until">
              {draft.validUntil
                ? formatDate(`${draft.validUntil}T12:00:00`, 'date', locale)
                : 'No expiry'}
            </SummaryRow>
          </dl>
          <QuoteTotals
            totals={totals}
            discountPct={Number(draft.discountPct) || 0}
            taxRatePct={Number(draft.taxRatePct) || 0}
            currency={currency}
            className="border-t pt-3"
          />

          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {saveError instanceof PartialWriteError
                ? saveError.message
                : 'The quote could not be saved. Try again.'}
            </p>
          )}
          <div className="mt-auto flex flex-col gap-1.5">
            <Button
              type="button"
              disabled={isPending || saveError instanceof PartialWriteError}
              onClick={() => save(true)}
            >
              Save and submit for approval
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={isPending || saveError instanceof PartialWriteError}
            >
              Save draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              nativeButton={false}
              render={<Link to={quote ? `/quotes?quote=${quote.id}` : '/quotes'} />}
            >
              Cancel
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{children}</dd>
    </div>
  );
}
