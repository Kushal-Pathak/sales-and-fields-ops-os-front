import { ClipboardCheckIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useSetTaskStatus } from '../hooks/use-task-mutations';
import type { TaskRow } from '../utils/task-view-model';
import { TaskDue, TaskPriority, TaskStatusBadge, TaskTypeLabel } from './task-fields';

interface TasksTableProps {
  rows: TaskRow[] | undefined;
  isPending: boolean;
  error: unknown;
  isFiltered: boolean;
  onOpen: (taskId: string) => void;
  onCreate: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}

const COLUMNS = [
  { label: 'Done', className: 'w-9 px-3', srOnly: true },
  { label: 'Task', className: 'w-[300px]' },
  { label: 'Type', className: 'w-[120px]' },
  { label: 'Lead', className: 'w-[200px]' },
  { label: 'Stage', className: 'w-[130px]' },
  { label: 'Assignee', className: 'w-[150px]' },
  { label: 'Due', className: 'w-[150px]' },
  { label: 'Priority', className: 'w-[100px]' },
  { label: 'Status', className: 'w-[120px]' },
  { label: 'Updated', className: '' },
] as const;

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** The tasks table. The leading checkbox completes or reopens; the row opens the drawer. */
export function TasksTable({
  rows,
  isPending,
  error,
  isFiltered,
  onOpen,
  onCreate,
  onClearFilters,
  onRetry,
}: TasksTableProps) {
  if (error)
    return <ErrorState title="Tasks could not be loaded" error={error} onRetry={onRetry} />;

  if (!isPending && rows && rows.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="No tasks match"
        hint="Try another view, search or filter."
        action={
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="Nothing to do"
        hint="Add a task to plan the next step on a lead."
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> Add task
          </Button>
        }
      />
    );
  }

  return (
    <Table containerClassName="overflow-visible" className="min-w-[1400px]">
      <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
        <TableRow className="border-border hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={cn(HEAD_CLASS, column.className)}>
              {'srOnly' in column ? <span className="sr-only">{column.label}</span> : column.label}
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
          : rows.map((row) => <TaskTableRow key={row.task.id} row={row} onOpen={onOpen} />)}
        {!isPending && (
          <TableRow className="border-0 hover:bg-muted">
            <TableCell colSpan={COLUMNS.length} className="p-0">
              <button
                type="button"
                onClick={onCreate}
                className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
              >
                <PlusIcon className="size-3.5" /> New task
              </button>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function TaskTableRow({ row, onOpen }: { row: TaskRow; onOpen: (taskId: string) => void }) {
  const { task, lead, contact, assignee, stage } = row;
  const locale = useWorkspace().data?.locale;
  const setStatus = useSetTaskStatus();
  const done = task.status === 'completed';
  const open = () => onOpen(task.id);

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
      aria-label={`Open task ${task.title}`}
      className={cn(
        'cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        done && 'text-muted-foreground',
      )}
    >
      <TableCell className={CELL_CLASS} onClick={(event) => event.stopPropagation()}>
        <Checkbox
          aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
          checked={done}
          disabled={task.status === 'cancelled'}
          onCheckedChange={(checked) =>
            setStatus.mutate({ id: task.id, status: checked ? 'completed' : 'pending' })
          }
        />
      </TableCell>
      <TableCell
        className={cn(CELL_CLASS, 'max-w-[300px] truncate font-semibold', done && 'line-through')}
      >
        {task.title}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <TaskTypeLabel type={task.type} />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[200px]')}>
        {lead ? (
          <span className="flex flex-col leading-tight">
            <span className="truncate">{contact?.name ?? '—'}</span>
            <span className="truncate text-xs text-foreground-faint">{lead.title}</span>
          </span>
        ) : (
          <span className="text-foreground-faint">—</span>
        )}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {stage ? <StatusBadge color={stage.color}>{stage.name}</StatusBadge> : ''}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {assignee ? (
          <span className="flex items-center gap-1.5">
            <InitialsAvatar size="sm" name={assignee.name} color={assignee.color} />
            <span className="truncate">{assignee.name}</span>
          </span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <TaskDue task={task} />
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <TaskPriority priority={task.priority} />
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <TaskStatusBadge task={task} />
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
        {formatRelative(task.updatedAt, undefined, locale)}
      </TableCell>
    </TableRow>
  );
}
