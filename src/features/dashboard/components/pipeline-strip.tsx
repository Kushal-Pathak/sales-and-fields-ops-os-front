import { Link } from 'react-router';
import { StatusBadge } from '@/components/common/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { formatMoney } from '@/lib/format';
import type { PipelineCell } from '../utils/dashboard-model';

/** One cell per stage: count and value, linking into the leads table filtered to that stage. */
export function PipelineStrip({ cells }: { cells: PipelineCell[] | undefined }) {
  const workspace = useWorkspace().data;
  const money = (amount: number) =>
    formatMoney(amount, { currency: workspace?.currency ?? 'USD', locale: workspace?.locale });

  return (
    <section aria-label="Pipeline" className="rounded-xl border">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-semibold">Pipeline</h2>
        <Link to="/leads/pipeline" className="text-xs text-muted-foreground hover:text-foreground">
          Open board
        </Link>
      </div>
      <div className="grid grid-cols-2 border-t sm:grid-cols-3 xl:grid-cols-6">
        {cells
          ? cells.map((cell) => (
              <Link
                key={cell.stage.id}
                to={`/leads?stage=${cell.stage.id}`}
                className="flex flex-col gap-1 border-r border-b px-3 py-2.5 transition outline-none last:border-r-0 hover:bg-muted focus-visible:bg-muted xl:border-b-0 [&:nth-child(2n)]:border-r-0 sm:[&:nth-child(2n)]:border-r sm:[&:nth-child(3n)]:border-r-0 xl:[&:nth-child(3n)]:border-r"
              >
                <StatusBadge color={cell.stage.color}>{cell.stage.name}</StatusBadge>
                <span className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tabular-nums">{cell.count}</span>
                  <span className="text-xs text-foreground-faint">
                    {cell.count === 1 ? 'lead' : 'leads'}
                  </span>
                </span>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {cell.total > 0 ? money(cell.total) : '—'}
                </span>
              </Link>
            ))
          : Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 border-r px-3 py-2.5 last:border-r-0">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
      </div>
    </section>
  );
}
