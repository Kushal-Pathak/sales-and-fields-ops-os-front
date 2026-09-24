import { ListIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusDot } from '@/components/common/status-dot';
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
import { formatDate, formatMoney, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LeadRow } from '../utils/lead-view-model';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../utils/priority';

interface LeadsTableProps {
  rows: LeadRow[] | undefined;
  isPending: boolean;
  error: unknown;
  /** True when a view or filter narrows the list, so "no results" offers to clear it. */
  isFiltered: boolean;
  onOpen: (leadId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

const COLUMNS = [
  { label: 'Contact', className: 'w-[200px]' },
  { label: 'Lead', className: 'w-[220px]' },
  { label: 'Company', className: 'w-[180px]' },
  { label: 'Source', className: 'w-[110px]' },
  { label: 'Stage', className: 'w-[140px]' },
  { label: 'Owner', className: 'w-[150px]' },
  { label: 'Next action', className: 'w-[190px]' },
  { label: 'Value', className: 'w-[110px] text-right' },
  { label: 'Priority', className: 'w-[100px]' },
  { label: 'Last activity', className: 'w-[120px]' },
  { label: 'Created', className: '' },
] as const;

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** The leads data table from the design system: sticky header, 32px rows, whole row opens the drawer. */
export function LeadsTable({
  rows,
  isPending,
  error,
  isFiltered,
  onOpen,
  onCreate,
  onClearFilters,
  onRetry,
}: LeadsTableProps) {
  const workspace = useWorkspace().data;
  const money = (amount: number) =>
    formatMoney(amount, { currency: workspace?.currency ?? 'USD', locale: workspace?.locale });

  if (error)
    return <ErrorState title="Leads could not be loaded" error={error} onRetry={onRetry} />;

  if (!isPending && rows && rows.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={ListIcon}
        title="No leads match"
        hint="Try a different view, search or filter."
        action={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ListIcon}
        title="No leads yet"
        hint="Add your first lead to start tracking opportunities."
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> Add lead
          </Button>
        }
      />
    );
  }

  return (
    <Table containerClassName="overflow-visible" className="min-w-[1560px]">
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
          ? Array.from({ length: 8 }, (_, index) => <SkeletonRow key={index} />)
          : rows.map((row) => (
              <LeadTableRow key={row.lead.id} row={row} money={money} onOpen={onOpen} />
            ))}
        {!isPending && (
          <TableRow className="border-0 hover:bg-muted">
            <TableCell colSpan={COLUMNS.length} className={cn(CELL_CLASS, 'p-0')}>
              <button
                type="button"
                onClick={onCreate}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
              >
                <PlusIcon className="size-3.5" /> New lead
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

interface LeadTableRowProps {
  row: LeadRow;
  money: (amount: number) => string;
  onOpen: (leadId: string) => void;
}

function LeadTableRow({ row, money, onOpen }: LeadTableRowProps) {
  const { lead, contact, owner, stage } = row;
  const workspace = useWorkspace().data;
  const locale = workspace?.locale;
  const open = () => onOpen(lead.id);

  return (
    <TableRow
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
      aria-label={`Open lead ${lead.title}${contact ? ` for ${contact.name}` : ''}`}
      className="cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
    >
      <TableCell className={CELL_CLASS}>
        <span className="flex items-center gap-2">
          <InitialsAvatar size="sm" name={contact?.name ?? '?'} />
          <span className="truncate font-semibold">{contact?.name ?? '—'}</span>
        </span>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[220px] truncate text-foreground-secondary')}>
        {lead.title}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[180px] truncate text-foreground-secondary')}>
        {contact?.company ?? '—'}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-foreground-secondary')}>
        <span className="flex items-center gap-1.5">
          <StatusDot color="neutral" />
          {lead.source}
        </span>
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {stage ? <StatusBadge color={stage.color}>{stage.name}</StatusBadge> : '—'}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {owner ? (
          <span className="flex items-center gap-1.5">
            <InitialsAvatar size="sm" name={owner.name} color={owner.color} />
            <span className="truncate">{owner.name}</span>
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[190px] text-foreground-secondary')}>
        {lead.nextAction ? (
          <span className="flex items-center gap-1.5">
            <span className="truncate">{lead.nextAction}</span>
            {lead.nextActionAt && (
              <span className="shrink-0 text-xs text-foreground-faint">
                {formatDate(lead.nextActionAt, 'monthDay', locale)}
              </span>
            )}
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-right font-semibold tabular-nums')}>
        {lead.value !== undefined ? (
          money(lead.value)
        ) : (
          <span className="text-foreground-faint">—</span>
        )}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <span className="flex items-center gap-1.5">
          <StatusDot color={PRIORITY_COLOR[lead.priority]} />
          {PRIORITY_LABEL[lead.priority]}
        </span>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
        {formatRelative(lead.lastActivityAt, undefined, locale)}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
        {formatDate(lead.createdAt, 'monthDay', locale)}
      </TableCell>
    </TableRow>
  );
}

function SkeletonRow() {
  return (
    <TableRow className="border-border-faint hover:bg-transparent">
      {COLUMNS.map((column) => (
        <TableCell key={column.label} className={CELL_CLASS}>
          <Skeleton className="h-4 w-3/4" />
        </TableCell>
      ))}
    </TableRow>
  );
}
