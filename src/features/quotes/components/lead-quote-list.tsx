import { FileTextIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useQuotes } from '../hooks/use-quotes';
import { isQuoteExpired } from '../utils/quote-workflow';
import { QuoteStatusBadge } from './quote-fields';

/**
 * A lead's quotes inside the lead drawer: open one in the quotes workspace, or
 * start a new one in the builder with the lead preselected.
 */
export function LeadQuoteList({ leadId }: { leadId: string }) {
  const quotes = useQuotes();
  const locale = useWorkspace().data?.locale;

  const rows = (quotes.rows ?? [])
    .filter((row) => row.quote.leadId === leadId)
    .sort((a, b) => b.quote.createdAt.localeCompare(a.quote.createdAt));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/quotes/new?lead=${leadId}`} />}
        >
          <PlusIcon /> New quote
        </Button>
      </div>

      {quotes.isPending ? (
        <ul className="flex flex-col">
          {Array.from({ length: 2 }, (_, index) => (
            <li key={index} className="border-b border-border-faint py-2.5 last:border-0">
              <Skeleton className="h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileTextIcon}
          title="No quotes for this lead"
          hint="Create one to price the work."
          className="p-2 pt-4"
        />
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ quote, totals }) => {
            const expired = isQuoteExpired(quote);
            return (
              <li
                key={quote.id}
                className="flex items-center gap-3 border-b border-border-faint py-2 last:border-0"
              >
                <Link to={`/quotes?quote=${quote.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="block truncate font-mono text-xs font-semibold">
                    {quote.number}
                  </span>
                  <span
                    className={cn(
                      'block truncate text-xs text-foreground-faint',
                      expired && 'text-destructive',
                    )}
                  >
                    {quote.items.length} item{quote.items.length === 1 ? '' : 's'}
                    {quote.validUntil &&
                      ` · ${expired ? 'Expired' : 'Valid until'} ${formatDate(quote.validUntil, 'monthDay', locale)}`}
                  </span>
                </Link>
                <span className="text-sm font-semibold tabular-nums">
                  {formatMoney(totals.total, { currency: quote.currency, locale })}
                </span>
                <QuoteStatusBadge status={quote.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
