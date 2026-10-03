import { QueryContent } from '@/components/common/query-content';
import { PlusIcon, ZapIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspace } from '@/features/workspace';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToggleAutomation } from '../hooks/use-automation-mutations';
import type { AutomationRow } from '../hooks/use-automations';

interface AutomationsTableProps {
  rows: AutomationRow[] | undefined;
  isPending: boolean;
  error: unknown;
  onOpen: (automationId: string) => void;
  onCreate: () => void;
  onRetry: () => void;
}

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** Every rule with its On switch; the row opens the drawer. */
export function AutomationsTable({
  rows,
  isPending,
  error,
  onOpen,
  onCreate,
  onRetry,
}: AutomationsTableProps) {
  const locale = useWorkspace().data?.locale;
  const toggle = useToggleAutomation();

  if (!isPending && rows && rows.length === 0) {
    return (
      <QueryContent
        error={error}
        hasData={rows !== undefined}
        title="Automations could not be loaded"
        onRetry={onRetry}
      >
        <EmptyState
          icon={ZapIcon}
          title="No automations yet"
          hint="Create a rule to assign leads, create tasks or send a message when something happens."
          action={
            <Button size="sm" onClick={onCreate}>
              <PlusIcon /> New automation
            </Button>
          }
        />
      </QueryContent>
    );
  }

  return (
    <QueryContent
      error={error}
      hasData={rows !== undefined}
      title="Automations could not be loaded"
      onRetry={onRetry}
    >
      <div className="rounded-xl border">
        <Table containerClassName="overflow-visible rounded-xl" className="min-w-[860px]">
          <TableHeader className="[&_th]:bg-sidebar [&_th:first-child]:rounded-tl-xl [&_th:last-child]:rounded-tr-xl">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={cn(HEAD_CLASS, 'w-14')}>On</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[220px]')}>Automation</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[240px]')}>When</TableHead>
              <TableHead className={HEAD_CLASS}>Then</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[110px]')}>Last run</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[70px] text-right')}>Runs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending || !rows
              ? Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index} className="border-border-faint hover:bg-transparent">
                    <TableCell className={CELL_CLASS} colSpan={6}>
                      <Skeleton className="h-4 w-2/3" />
                    </TableCell>
                  </TableRow>
                ))
              : rows.map(({ automation, triggerText, actionsText }) => (
                  <TableRow
                    key={automation.id}
                    tabIndex={0}
                    onClick={() => onOpen(automation.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onOpen(automation.id);
                      }
                    }}
                    aria-label={`Open automation ${automation.name}`}
                    className={cn(
                      'cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                      !automation.active && 'text-muted-foreground',
                    )}
                  >
                    <TableCell className={CELL_CLASS} onClick={(event) => event.stopPropagation()}>
                      <Switch
                        size="sm"
                        aria-label={`${automation.name} active`}
                        checked={automation.active}
                        onCheckedChange={(active) => toggle.mutate({ id: automation.id, active })}
                      />
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'font-semibold')}>
                      {automation.name}
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-foreground-secondary')}>
                      {triggerText}
                    </TableCell>
                    <TableCell
                      className={cn(CELL_CLASS, 'max-w-[360px] truncate text-foreground-secondary')}
                    >
                      {actionsText}
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
                      {automation.lastRunAt
                        ? formatRelative(automation.lastRunAt, undefined, locale)
                        : 'Never'}
                    </TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-right tabular-nums')}>
                      {automation.runCount}
                    </TableCell>
                  </TableRow>
                ))}
            {!isPending && (
              <TableRow className="border-0 hover:bg-muted">
                <TableCell colSpan={6} className="p-0">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" /> New automation
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </QueryContent>
  );
}
