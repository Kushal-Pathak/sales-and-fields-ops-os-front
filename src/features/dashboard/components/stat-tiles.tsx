import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ModuleId } from '@/types/domain';
import type { DashboardStats } from '../utils/dashboard-model';

interface StatTilesProps {
  stats: DashboardStats | undefined;
  /** Whether a module is open to the user; tiles of closed modules are left out. */
  isOpen: (module: ModuleId) => boolean;
}

interface Tile {
  label: string;
  value: string | number;
  sub: string;
  to: string;
  module: ModuleId;
  alert?: boolean;
}

/** The module behind each tile, in order; sizes the loading placeholders before stats arrive. */
const TILE_MODULES: ModuleId[] = ['leads', 'leads', 'appointments', 'quotes', 'leads', 'tasks'];

/** The headline numbers. Each tile links to the list it summarises. */
export function StatTiles({ stats, isOpen }: StatTilesProps) {
  const workspace = useWorkspace().data;
  const money = (amount: number) =>
    formatMoney(amount, { currency: workspace?.currency ?? 'USD', locale: workspace?.locale });

  const all: Tile[] | undefined = stats
    ? [
        {
          label: 'New leads today',
          value: stats.newLeadsToday,
          sub: 'Created today',
          to: '/leads?sort=-created',
          module: 'leads',
        },
        {
          label: 'Hot leads',
          value: stats.hotLeads,
          sub: 'High priority, still open',
          to: '/leads?view=hot',
          module: 'leads',
        },
        {
          label: 'Appointments today',
          value: stats.appointmentsToday,
          sub: 'Scheduled',
          to: '/appointments',
          module: 'appointments',
        },
        {
          label: 'Quotes pending',
          value: stats.quotesPending,
          sub: 'Awaiting approval',
          to: '/quotes',
          module: 'quotes',
        },
        {
          label: 'Won this month',
          value: money(stats.wonThisMonth.value),
          sub: `${stats.wonThisMonth.count} deal${stats.wonThisMonth.count === 1 ? '' : 's'} closed`,
          to: '/leads?view=won',
          module: 'leads',
        },
        {
          label: 'Overdue tasks',
          value: stats.overdueTasks,
          sub: stats.overdueTasks > 0 ? 'Action needed' : 'All caught up',
          to: '/tasks?view=overdue',
          module: 'tasks',
          alert: stats.overdueTasks > 0,
        },
      ]
    : undefined;
  const tiles = all?.filter((tile) => isOpen(tile.module));
  const placeholders = TILE_MODULES.filter(isOpen).length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles
        ? tiles.map((tile) => (
            <Link
              key={tile.label}
              to={tile.to}
              className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Card
                size="sm"
                className="h-full gap-0.5 px-3 py-3 transition hover:bg-muted hover:shadow-card"
              >
                <span className="text-xs text-muted-foreground">{tile.label}</span>
                <span
                  className={cn(
                    'text-3xl font-bold tabular-nums',
                    tile.alert && 'text-destructive',
                  )}
                >
                  {tile.value}
                </span>
                <span className="text-xs text-foreground-faint">{tile.sub}</span>
              </Card>
            </Link>
          ))
        : Array.from({ length: placeholders }, (_, index) => (
            <Card key={index} size="sm" className="gap-2 px-3 py-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
    </div>
  );
}
