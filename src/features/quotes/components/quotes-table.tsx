import { FileTextIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspace } from '@/features/workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { QuoteRow } from '../utils/quote-view-model';
import { isQuoteExpired } from '../utils/quote-workflow';
import { QuoteStatusBadge } from './quote-fields';

interface QuotesTableProps {
  rows: QuoteRow[] | undefined;
  isPending: boolean;
  error: unknown;
  isFiltered: boolean;
  onOpen: (quoteId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

const COLUMNS = [
  { label: 'Quote', className: 'w-[100px]' },
  { label: 'Customer', className: 'w-[180px]' },
  { label: 'Lead', className: 'w-[260px]' },
  { label: 'Created by', className: 'w-[160px]' },
  { label: 'Amount', className: 'w-[120px] text-right' },
  { label: 'Discount', className: 'w-[90px] text-right' },
  { label: 'Status', className: 'w-[150px]' },
  { label: 'Valid until', className: 'w-[120px]' },
  { label: 'Created', className: '' },
] as const;

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** The quotes table. Rows open the drawer; the trailing row starts a new quote. */
export function QuotesTable({
  rows,
  isPending,
  error,
  isFiltered,
  onOpen,
  onCreate,
  onClearFilters,
  onRetry,
}: QuotesTableProps) {
  if (error)
    return <ErrorState title="Quotes could not be loaded" error={error} onRetry={onRetry} />;

  if (!isPending && rows && rows.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={FileTextIcon}
        title="No quotes match"
        hint="Try another view, search or filter."
        action={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={FileTextIcon}
        title="No quotes yet"
        hint="Price an offer for a lead and send it for approval."
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> New quote
          </Button>
        }
      />
    );
  }

  return (
    <Table containerClassName="overflow-visible" className="min-w-[1280px]">
      <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
        <TableRow className="border-border hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={cn(HEAD_CLASS, column.className)}>
              {column.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending || !rows
          ? Array.from({ length: 8 }, (_, index) => (
              <TableRow key={index} className="border-border-faint hover:bg-transparent">
                {COLUMNS.map((column) => (
                  <TableCell key={column.label} className={CELL_CLASS}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : rows.map((row) => <QuoteTableRow key={row.quote.id} row={row} onOpen={onOpen} />)}
        {!isPending && (
          <TableRow className="border-0 hover:bg-muted">
            <TableCell colSpan={COLUMNS.length} className="p-0">
              <button
                type="button"
                onClick={onCreate}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
              >
                <PlusIcon className="size-3.5" /> New quote
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function QuoteTableRow({ row, onOpen }: { row: QuoteRow; onOpen: (quoteId: string) => void }) {
  const { quote, lead, contact, stage, createdBy, totals } = row;
  const locale = useWorkspace().data?.locale;
  const expired = isQuoteExpired(quote);
  const open = () => onOpen(quote.id);

  return (
    <TableRow
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          open();
        }
      }}
      aria-label={`Open quote ${quote.number}`}
      className="cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <TableCell className={cn(CELL_CLASS, 'font-mono text-xs')}>{quote.number}</TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[180px] truncate font-semibold')}>
        {contact?.name ?? '—'}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[260px]')}>
        {lead ? (
          <span className="flex items-center gap-2">
            <span className="truncate">{lead.title}</span>
            {stage && (
              <StatusBadge color={stage.color} className="shrink-0">
                {stage.name}
              </StatusBadge>
            )}
          </span>
        ) : (
          <span className="text-foreground-faint">—</span>
        )}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {createdBy ? (
          <span className="flex items-center gap-1.5">
            <InitialsAvatar size="sm" name={createdBy.name} color={createdBy.color} />
            <span className="truncate">{createdBy.name}</span>
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-right font-semibold tabular-nums')}>
        {formatMoney(totals.total, { currency: quote.currency, locale })}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-right tabular-nums text-foreground-secondary')}>
        {quote.discountPct > 0 ? `${quote.discountPct}%` : '—'}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <QuoteStatusBadge status={quote.status} />
      </TableCell>
      <TableCell
        className={cn(
          CELL_CLASS,
          expired ? 'font-semibold text-destructive' : 'text-foreground-secondary',
        )}
      >
        {quote.validUntil ? formatDate(quote.validUntil, 'date', locale) : '—'}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
        {formatDate(quote.createdAt, 'date', locale)}
      </TableCell>
    </TableRow>
  );
}
