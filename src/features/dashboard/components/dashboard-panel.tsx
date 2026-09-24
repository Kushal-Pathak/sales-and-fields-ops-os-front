import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardPanelProps {
  icon: LucideIcon;
  title: string;
  /** Total matching rows (the list itself is capped). */
  count: number | undefined;
  /** Where "View all" goes. */
  to: string;
  emptyText: string;
  isPending: boolean;
  children: ReactNode;
}

/** A bordered list card: icon + title + count on top, up to five rows, "View all" link. */
export function DashboardPanel({
  icon: Icon,
  title,
  count,
  to,
  emptyText,
  isPending,
  children,
}: DashboardPanelProps) {
  return (
    <section aria-label={title} className="flex flex-col rounded-xl border">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="size-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {count !== undefined && (
          <span
            className={cn(
              'text-xs',
              count > 0 ? 'font-semibold text-foreground-secondary' : 'text-foreground-faint',
            )}
          >
            {count}
          </span>
        )}
        <Link to={to} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
          View all
        </Link>
      </header>
      {isPending ? (
        <ul className="flex flex-col px-3">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="border-b border-border-faint py-2.5 last:border-0">
              <Skeleton className="h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : count === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col px-1 py-1">{children}</ul>
      )}
    </section>
  );
}

interface PanelRowProps {
  to: string;
  leading?: ReactNode;
  title: string;
  meta: string;
  trailing?: ReactNode;
}

/** One clickable row inside a `DashboardPanel`. */
export function PanelRow({ to, leading, title, meta, trailing }: PanelRowProps) {
  return (
    <li>
      <Link
        to={to}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none hover:bg-muted focus-visible:bg-muted"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-foreground-faint">{meta}</span>
        </span>
        {trailing}
      </Link>
    </li>
  );
}
