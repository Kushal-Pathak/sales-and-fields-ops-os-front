import { useState, type ReactNode } from 'react';
import {
  CopyIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PrinterIcon,
  SearchXIcon,
  TrashIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusDot } from '@/components/common/status-dot';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/features/auth';
import { useUsers, useWorkspace } from '@/features/workspace';
import { formatDate, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useQuote, useQuoteActivities } from '../hooks/use-quote';
import { useDeleteQuote, useDuplicateQuote, useQuoteAction } from '../hooks/use-quote-mutations';
import type { QuoteRow } from '../utils/quote-view-model';
import {
  availableActions,
  isQuoteEditable,
  isQuoteExpired,
  QUOTE_ACTION_LABEL,
  type QuoteAction,
} from '../utils/quote-workflow';
import { QuoteItemsList, QuoteStatusBadge, QuoteTotals } from './quote-fields';

interface QuoteDrawerProps {
  quoteId: string | null;
  onClose: () => void;
}

/** The quote detail panel, opened by `?quote=<id>`. */
export function QuoteDrawer({ quoteId, onClose }: QuoteDrawerProps) {
  return (
    <DrawerPanel open={quoteId !== null} onOpenChange={(open) => !open && onClose()}>
      {quoteId !== null && <QuoteDrawerContent key={quoteId} quoteId={quoteId} onClose={onClose} />}
    </DrawerPanel>
  );
}

function QuoteDrawerContent({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const { row, isPending, notFound, error, refetch } = useQuote(quoteId);

  if (notFound) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Quote not found</DrawerTitle>
          <DrawerDescription>The link may be stale.</DrawerDescription>
        </DrawerHeader>
        <EmptyState
          icon={SearchXIcon}
          title="This quote no longer exists"
          hint="It may have been deleted."
          action={
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        />
      </>
    );
  }
  if (error) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Quote</DrawerTitle>
          <DrawerDescription>Something went wrong.</DrawerDescription>
        </DrawerHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    );
  }
  if (isPending || !row) {
    return (
      <DrawerHeader className="gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-7 w-40" />
      </DrawerHeader>
    );
  }
  return <QuoteDetails row={row} onClose={onClose} />;
}

/** Actions that move the quote forward render as the primary button, last in the row. */
const PRIMARY_ACTIONS: ReadonlySet<QuoteAction> = new Set(['submit', 'approve', 'send', 'accept']);
const DESTRUCTIVE_ACTIONS: ReadonlySet<QuoteAction> = new Set(['reject', 'decline']);
/** Only roles with `quotes.approve` see these. */
const APPROVAL_ACTIONS: ReadonlySet<QuoteAction> = new Set(['approve', 'reject', 'revise']);

function QuoteDetails({ row, onClose }: { row: QuoteRow; onClose: () => void }) {
  const { quote, lead, contact, stage, createdBy, totals } = row;
  const locale = useWorkspace().data?.locale;
  const navigate = useNavigate();
  const act = useQuoteAction();
  const duplicate = useDuplicateQuote();
  const remove = useDeleteQuote();
  const [deleting, setDeleting] = useState(false);
  const expired = isQuoteExpired(quote);
  const canApprove = useCan('quotes.approve');
  const actions = availableActions(quote.status)
    .filter((action) => canApprove || !APPROVAL_ACTIONS.has(action))
    .sort((a, b) => Number(PRIMARY_ACTIONS.has(a)) - Number(PRIMARY_ACTIONS.has(b)));

  return (
    <>
      <DrawerHeader className="gap-3">
        <div>
          <p className="font-mono text-xs text-foreground-faint">{quote.number}</p>
          <DrawerTitle>{contact?.name ?? 'Quote'}</DrawerTitle>
          <DrawerDescription className="sr-only">Quote details</DrawerDescription>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <QuoteStatusBadge status={quote.status} />
            {expired && <StatusBadge color="destructive">Expired</StatusBadge>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isQuoteEditable(quote.status) && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to={`/quotes/${quote.id}/edit`} />}
            >
              <PencilIcon /> Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link to={`/quotes/${quote.id}/print`} />}
          >
            <PrinterIcon /> Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                disabled={duplicate.isPending}
                onClick={() =>
                  duplicate.mutate(quote.id, {
                    onSuccess: (copy) => navigate(`/quotes?quote=${copy.id}`),
                  })
                }
              >
                <CopyIcon /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <TrashIcon /> Delete quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Lead">
            {lead && (
              <Link to={`/leads?lead=${lead.id}`} className="block truncate hover:underline">
                {lead.title}
              </Link>
            )}
          </Field>
          <Field label="Stage">
            {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
          </Field>
          <Field label="Created by">
            {createdBy && (
              <span className="flex items-center gap-1.5">
                <InitialsAvatar size="sm" name={createdBy.name} color={createdBy.color} />
                {createdBy.name}
              </span>
            )}
          </Field>
          <Field label="Created">{formatDate(quote.createdAt, 'date', locale)}</Field>
          <Field label="Valid until">
            {quote.validUntil && (
              <span className={cn(expired && 'font-semibold text-destructive')}>
                {formatDate(quote.validUntil, 'date', locale)}
              </span>
            )}
          </Field>
          <Field label="Sent">{quote.sentAt && formatDate(quote.sentAt, 'datetime', locale)}</Field>
        </dl>

        <Section title={`Line items · ${quote.items.length}`}>
          <QuoteItemsList items={quote.items} currency={quote.currency} />
          <QuoteTotals
            totals={totals}
            discountPct={quote.discountPct}
            taxRatePct={quote.taxRatePct}
            currency={quote.currency}
            className="mt-3 ml-auto w-64"
          />
        </Section>

        <Section title="Notes">
          {quote.notes ? (
            <p className="text-sm whitespace-pre-wrap text-foreground-secondary">{quote.notes}</p>
          ) : (
            <p className="text-sm text-foreground-faint">No notes.</p>
          )}
        </Section>

        <Section title="Terms">
          {quote.terms ? (
            <p className="text-sm whitespace-pre-wrap text-foreground-secondary">{quote.terms}</p>
          ) : (
            <p className="text-sm text-foreground-faint">No terms.</p>
          )}
        </Section>

        <Section title="History">
          <QuoteHistory quoteId={quote.id} />
        </Section>
      </DrawerBody>

      {actions.length > 0 && (
        <DrawerFooter className="justify-end">
          {act.isError && (
            <span role="alert" className="mr-auto text-xs text-destructive">
              The change could not be saved.
            </span>
          )}
          {actions.map((action) => (
            <Button
              key={action}
              size="sm"
              variant={PRIMARY_ACTIONS.has(action) ? 'default' : 'outline'}
              className={cn(DESTRUCTIVE_ACTIONS.has(action) && 'text-destructive')}
              disabled={act.isPending}
              onClick={() => act.mutate({ id: quote.id, action })}
            >
              {QUOTE_ACTION_LABEL[action]}
            </Button>
          ))}
        </DrawerFooter>
      )}

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              {quote.number} will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(quote.id, {
                  onSuccess: () => {
                    setDeleting(false);
                    onClose();
                  },
                })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function QuoteHistory({ quoteId }: { quoteId: string }) {
  const activities = useQuoteActivities(quoteId);
  const users = useUsers().data ?? [];
  const locale = useWorkspace().data?.locale;
  const actorName = (id: string | null) =>
    id === null ? 'System' : (users.find((user) => user.id === id)?.name ?? 'Unknown user');

  if (activities.isPending) return <Skeleton className="h-4 w-2/3" />;
  const rows = activities.data ?? [];
  if (rows.length === 0) return <p className="text-sm text-foreground-faint">No history yet.</p>;
  return (
    <ol className="flex flex-col">
      {rows.map((activity) => (
        <li
          key={activity.id}
          className="flex gap-2.5 border-b border-border-faint py-2 last:border-0"
        >
          <StatusDot color="warning" className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{activity.message}</p>
            <p className="mt-0.5 text-xs text-foreground-faint">
              {formatRelative(activity.createdAt, undefined, locale)} ·{' '}
              {actorName(activity.actorId)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === undefined || children === null || children === false;
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">{label}</dt>
      <dd className={cn('mt-0.5 text-base', empty && 'text-foreground-faint')}>
        {empty ? '—' : children}
      </dd>
    </div>
  );
}
