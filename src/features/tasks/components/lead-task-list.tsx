import { useState } from 'react';
import { ClipboardCheckIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers } from '@/features/workspace';
import { cn } from '@/lib/utils';
import { useSetTaskStatus } from '../hooks/use-task-mutations';
import { useTasks } from '../hooks/use-tasks';
import { TASK_TYPE_LABEL } from '../utils/task-labels';
import { TaskDue, TaskStatusBadge } from './task-fields';
import { TaskFormDialog } from './task-form-dialog';

interface LeadTaskListProps {
  leadId: string;
  /** Only pending / in-progress tasks (for the lead overview). */
  openOnly?: boolean;
  /** Show the "Add task" button (the lead drawer's Tasks tab). */
  withCreate?: boolean;
}

/**
 * A lead's tasks inside the lead drawer: complete with the checkbox, open in the
 * tasks workspace, or add a new one with the lead preselected.
 */
export function LeadTaskList({ leadId, openOnly = false, withCreate = false }: LeadTaskListProps) {
  const tasks = useTasks();
  const users = useUsers().data ?? [];
  const setStatus = useSetTaskStatus();
  const [creating, setCreating] = useState(false);

  const rows = (tasks.rows ?? [])
    .filter((row) => row.task.leadId === leadId)
    .filter(
      (row) => !openOnly || row.task.status === 'pending' || row.task.status === 'in_progress',
    )
    .sort((a, b) => a.task.dueAt.localeCompare(b.task.dueAt));

  return (
    <div className="flex flex-col gap-2">
      {withCreate && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <PlusIcon /> Add task
          </Button>
        </div>
      )}

      {tasks.isPending ? (
        <ul className="flex flex-col">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="border-b border-border-faint py-2.5 last:border-0">
              <Skeleton className="h-4 w-2/3" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        openOnly ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <EmptyState
            icon={ClipboardCheckIcon}
            title="No tasks for this lead"
            hint="Add one to plan the next step."
            className="p-2 pt-4"
          />
        )
      ) : (
        <ul className="flex flex-col">
          {rows.map(({ task }) => {
            const done = task.status === 'completed';
            return (
              <li
                key={task.id}
                className="flex items-center gap-2.5 border-b border-border-faint py-2 last:border-0"
              >
                <Checkbox
                  aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
                  checked={done}
                  disabled={task.status === 'cancelled'}
                  onCheckedChange={(checked) =>
                    setStatus.mutate({ id: task.id, status: checked ? 'completed' : 'pending' })
                  }
                />
                <Link
                  to={`/tasks?view=all&task=${task.id}`}
                  className={cn(
                    'min-w-0 flex-1 hover:underline',
                    done && 'text-muted-foreground line-through',
                  )}
                >
                  <span className="block truncate text-sm font-medium">{task.title}</span>
                  <span className="block truncate text-xs text-foreground-faint">
                    {TASK_TYPE_LABEL[task.type]} ·{' '}
                    {users.find((user) => user.id === task.assigneeId)?.name ?? 'Unassigned'}
                  </span>
                </Link>
                <TaskDue task={task} style="monthDay" className="shrink-0 text-xs" />
                {!openOnly && <TaskStatusBadge task={task} />}
              </li>
            );
          })}
        </ul>
      )}

      <TaskFormDialog open={creating} onOpenChange={setCreating} defaultLeadId={leadId} />
    </div>
  );
}
