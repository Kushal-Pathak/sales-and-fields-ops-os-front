import { StatusBadge } from '@/components/common/status-badge';
import { useWorkspace } from '@/features/workspace';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { QuoteLineItem, QuoteStatus, QuoteTotals as Totals } from '@/types/domain';
import { QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL } from '../utils/quote-labels';

/** Small presentational pieces shared by the table, drawer, builder, print view and lead drawer. */

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return <StatusBadge color={QUOTE_STATUS_COLOR[status]}>{QUOTE_STATUS_LABEL[status]}</StatusBadge>;
}

interface QuoteTotalsProps {
  totals: Totals;
  discountPct: number;
  taxRatePct: number;
  currency: string;
  className?: string | undefined;
}

/** Subtotal · Discount · Tax · Total, right-aligned tabular figures. */
export function QuoteTotals({
  totals,
  discountPct,
  taxRatePct,
  currency,
  className,
}: QuoteTotalsProps) {
  const locale = useWorkspace().data?.locale;
  const money = (amount: number) => formatMoney(amount, { currency, locale, compact: false });
  const row = 'flex items-center justify-between gap-4 text-sm';
  return (
    <dl className={cn('flex flex-col gap-1.5', className)}>
      <div className={row}>
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="tabular-nums">{money(totals.subtotal)}</dd>
      </div>
      {discountPct > 0 && (
        <div className={row}>
          <dt className="text-muted-foreground">Discount ({discountPct}%)</dt>
          <dd className="tabular-nums text-destructive">− {money(totals.discount)}</dd>
        </div>
      )}
      <div className={row}>
        <dt className="text-muted-foreground">Tax ({taxRatePct}%)</dt>
        <dd className="tabular-nums">{money(totals.tax)}</dd>
      </div>
      <div className={cn(row, 'mt-1 border-t border-border pt-2 text-base font-bold')}>
        <dt>Total</dt>
        <dd className="tabular-nums">{money(totals.total)}</dd>
      </div>
    </dl>
  );
}

/** Read-only line items: description, quantity × unit price, line amount. */
export function QuoteItemsList({ items, currency }: { items: QuoteLineItem[]; currency: string }) {
  const locale = useWorkspace().data?.locale;
  const money = (amount: number) => formatMoney(amount, { currency, locale });
  return (
    <ul className="flex flex-col">
      {items.map((item) => {
        const amount = item.quantity * item.unitPrice * (1 - (item.discountPct ?? 0) / 100);
        return (
          <li
            key={item.id}
            className="flex items-start gap-3 border-b border-border-faint py-2 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm">{item.description}</p>
              <p className="text-xs text-foreground-faint">
                {item.quantity} {item.unit ?? ''} × {money(item.unitPrice)}
                {item.discountPct ? ` · ${item.discountPct}% off` : ''}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {money(Math.round(amount * 100) / 100)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
