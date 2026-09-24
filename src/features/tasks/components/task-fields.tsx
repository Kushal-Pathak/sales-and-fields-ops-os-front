import { StatusBadge } from '@/components/common/status-badge';
import { StatusDot } from '@/components/common/status-dot';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isTaskOverdue, type Priority, type Task } from '@/types/domain';
import {
  PRIORITY_LABEL,
  TASK_TYPE_COLOR,
  TASK_TYPE_LABEL,
  taskStatusBadge,
} from '../utils/task-labels';

/** Small presentational pieces shared by the table, the board, the drawer and the lead drawer. */

const PRIORITY_COLOR = { high: 'destructive', medium: 'warning', low: 'neutral' } as const;

export function TaskTypeLabel({ type }: { type: Task['type'] }) {
  return (
    <span className="flex items-center gap-1.5 text-foreground-secondary">
      <StatusDot color={TASK_TYPE_COLOR[type]} />
      {TASK_TYPE_LABEL[type]}
    </span>
  );
}

export function TaskStatusBadge({ task }: { task: Pick<Task, 'status' | 'dueAt'> }) {
  const { label, color } = taskStatusBadge(task);
  return <StatusBadge color={color}>{label}</StatusBadge>;
}

export function TaskPriority({ priority }: { priority: Priority }) {
  return (
    <span className="flex items-center gap-1.5">
      <StatusDot color={PRIORITY_COLOR[priority]} />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

/** Due date in red when overdue; time shown for open tasks. */
export function TaskDue({
  task,
  style = 'datetime',
  className,
}: {
  task: Pick<Task, 'status' | 'dueAt'>;
  style?: 'datetime' | 'monthDay';
  className?: string;
}) {
  const locale = useWorkspace().data?.locale;
  const overdue = isTaskOverdue(task);
  return (
    <span
      className={cn(
        overdue ? 'font-semibold text-destructive' : 'text-foreground-secondary',
        className,
      )}
    >
      {formatDate(task.dueAt, style, locale)}
    </span>
  );
}
