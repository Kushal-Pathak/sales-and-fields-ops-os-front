import { useEffect } from 'react';
import { ArrowLeftIcon, PrinterIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { QueryContent } from '@/components/common/query-content';
import { getQueryError } from '@/data/query-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { env } from '@/lib/env';
import { formatDate, formatMoney } from '@/lib/format';
import { useQuote } from '../hooks/use-quote';
import { QUOTE_STATUS_LABEL } from '../utils/quote-labels';
import { QuoteTotals } from './quote-fields';

/**
 * The customer-facing quote, laid out for paper. Rendered outside the app shell and
 * forced to the light tokens (`.light`) so it prints the same in dark mode.
 */
export function QuotePrint({ quoteId }: { quoteId: string }) {
  const { row, isPending, notFound, error, refetch } = useQuote(quoteId);
  const workspace = useWorkspace();
  const queryError = getQueryError([{ error }, workspace]);
  const number = row?.quote.number;

  useEffect(() => {
    document.title = number ? `${number} · ${env.appName}` : env.appName;
  }, [number]);

  return (
    <div className="light min-h-screen bg-muted text-foreground print:bg-background">
      <div className="mx-auto flex max-w-[800px] items-center gap-2 px-4 py-3 print:hidden">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/quotes?quote=${quoteId}`} />}
        >
          <ArrowLeftIcon /> Back
        </Button>
        <Button size="sm" className="ml-auto" disabled={!row} onClick={() => window.print()}>
          <PrinterIcon /> Print
        </Button>
      </div>

      <article className="mx-auto max-w-[800px] bg-background p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <QueryContent
          error={queryError}
          hasData={Boolean(row && workspace.data)}
          title="Quote could not be loaded"
          onRetry={() => void Promise.all([refetch(), workspace.refetch()])}
        >
          {notFound ? (
            <EmptyState title="This quote no longer exists" icon={PrinterIcon} />
          ) : isPending || !row || !workspace.data ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <PrintSheet
              row={row}
              workspaceName={workspace.data.name}
              locale={workspace.data.locale}
            />
          )}
        </QueryContent>
      </article>
    </div>
  );
}

function PrintSheet({
  row,
  workspaceName,
  locale,
}: {
  row: NonNullable<ReturnType<typeof useQuote>['row']>;
  workspaceName: string;
  locale: string;
}) {
  const { quote, lead, contact, createdBy, totals } = row;
  const money = (amount: number) =>
    formatMoney(amount, { currency: quote.currency, locale, compact: false });
  const label = 'text-2xs font-bold tracking-wider text-foreground-faint uppercase';

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xl font-bold">{workspaceName}</p>
          <p className="mt-1 text-sm text-muted-foreground">Quote</p>
        </div>
        <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-right text-sm">
          <dt className="text-muted-foreground">Quote</dt>
          <dd className="font-mono font-semibold">{quote.number}</dd>
          <dt className="text-muted-foreground">Date</dt>
          <dd>{formatDate(quote.createdAt, 'date', locale)}</dd>
          {quote.validUntil && (
            <>
              <dt className="text-muted-foreground">Valid until</dt>
              <dd>{formatDate(quote.validUntil, 'date', locale)}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Status</dt>
          <dd>{QUOTE_STATUS_LABEL[quote.status]}</dd>
        </dl>
      </header>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className={label}>Prepared for</p>
          <p className="mt-1 font-semibold">{contact?.name ?? '—'}</p>
          {contact?.company && <p>{contact.company}</p>}
          {contact?.email && <p className="text-muted-foreground">{contact.email}</p>}
          {contact?.phone && <p className="text-muted-foreground">{contact.phone}</p>}
          {lead && <p className="mt-1 text-muted-foreground">Re: {lead.title}</p>}
        </div>
        <div>
          <p className={label}>Prepared by</p>
          <p className="mt-1 font-semibold">{createdBy?.name ?? workspaceName}</p>
          {createdBy?.email && <p className="text-muted-foreground">{createdBy.email}</p>}
          {createdBy?.phone && <p className="text-muted-foreground">{createdBy.phone}</p>}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-semibold">Description</th>
            <th className="py-2 pr-3 text-right font-semibold">Qty</th>
            <th className="py-2 pr-3 text-right font-semibold">Unit price</th>
            <th className="py-2 pr-3 text-right font-semibold">Discount</th>
            <th className="py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item) => {
            const amount = item.quantity * item.unitPrice * (1 - (item.discountPct ?? 0) / 100);
            return (
              <tr key={item.id} className="border-b border-border-faint align-top">
                <td className="py-2 pr-3">{item.description}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {item.quantity}
                  {item.unit ? ` ${item.unit}` : ''}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{money(item.unitPrice)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {item.discountPct ? `${item.discountPct}%` : '—'}
                </td>
                <td className="py-2 text-right font-medium tabular-nums">
                  {money(Math.round(amount * 100) / 100)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <QuoteTotals
        totals={totals}
        discountPct={quote.discountPct}
        taxRatePct={quote.taxRatePct}
        currency={quote.currency}
        className="ml-auto w-72"
      />

      {quote.notes && (
        <section className="text-sm">
          <p className={label}>Notes</p>
          <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
        </section>
      )}
      {quote.terms && (
        <section className="text-sm">
          <p className={label}>Terms and conditions</p>
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{quote.terms}</p>
        </section>
      )}
    </div>
  );
}
