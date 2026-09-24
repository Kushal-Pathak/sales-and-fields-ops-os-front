import { useState, type FormEvent } from 'react';
import {
  CalendarClockIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SearchXIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { fromDateTimeInputs, toDateInput, toTimeInput } from '@/lib/dates';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useTask } from '../hooks/use-task';
import { useDeleteTask, useSetTaskStatus, useUpdateTask } from '../hooks/use-task-mutations';
import { TASK_TYPE_COLOR, TASK_TYPE_LABEL } from '../utils/task-labels';
import type { TaskRow } from '../utils/task-view-model';
import { TaskDue, TaskPriority, TaskStatusBadge } from './task-fields';
import { TaskFormDialog } from './task-form-dialog';

interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

/** The task detail panel, opened by `?task=<id>`. */
export function TaskDrawer({ taskId, onClose }: TaskDrawerProps) {
  return (
    <DrawerPanel open={taskId !== null} onOpenChange={(open) => !open && onClose()}>
      {taskId !== null && <TaskDrawerContent key={taskId} taskId={taskId} onClose={onClose} />}
    </DrawerPanel>
  );
}

function TaskDrawerContent({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { row, isPending, notFound, error, refetch } = useTask(taskId);

  if (notFound) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Task not found</DrawerTitle>
          <DrawerDescription>The link may be stale.</DrawerDescription>
        </DrawerHeader>
        <EmptyState
          icon={SearchXIcon}
          title="This task no longer exists"
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
          <DrawerTitle>Task</DrawerTitle>
          <DrawerDescription>Something went wrong.</DrawerDescription>
        </DrawerHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    );
  }
  if (isPending || !row) {
    return (
      <DrawerHeader className="gap-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-40" />
      </DrawerHeader>
    );
  }
  return <TaskDetails row={row} onClose={onClose} />;
}

function TaskDetails({ row, onClose }: { row: TaskRow; onClose: () => void }) {
  const { task, lead, contact, assignee, stage } = row;
  const locale = useWorkspace().data?.locale;
  const setStatus = useSetTaskStatus();
  const deleteTask = useDeleteTask();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const done = task.status === 'completed';
  const cancelled = task.status === 'cancelled';

  const move = (status: typeof task.status) => setStatus.mutate({ id: task.id, status });

  return (
    <>
      <DrawerHeader className="gap-3">
        <div>
          <DrawerTitle className={cn(done && 'text-muted-foreground line-through')}>
            {task.title}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Task details</DrawerDescription>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge color={TASK_TYPE_COLOR[task.type]}>
              {TASK_TYPE_LABEL[task.type]}
            </StatusBadge>
            <TaskStatusBadge task={task} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon /> Edit
          </Button>
          {!done && !cancelled && <ReschedulePopover taskId={task.id} dueAt={task.dueAt} />}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {task.status === 'pending' && (
                <DropdownMenuItem onClick={() => move('in_progress')}>
                  <PlayIcon /> Start
                </DropdownMenuItem>
              )}
              {task.status === 'in_progress' && (
                <DropdownMenuItem onClick={() => move('pending')}>
                  <RotateCcwIcon /> Back to pending
                </DropdownMenuItem>
              )}
              {!cancelled && !done && (
                <DropdownMenuItem onClick={() => move('cancelled')}>
                  <XIcon /> Cancel task
                </DropdownMenuItem>
              )}
              {cancelled && (
                <DropdownMenuItem onClick={() => move('pending')}>
                  <RotateCcwIcon /> Restore
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <TrashIcon /> Delete task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Lead">
            {lead ? (
              <Link
                to={`/leads?lead=${lead.id}`}
                className="flex flex-col leading-tight hover:underline"
              >
                <span className="truncate">{contact?.name ?? '—'}</span>
                <span className="truncate text-xs text-foreground-faint">{lead.title}</span>
              </Link>
            ) : undefined}
          </Field>
          <Field label="Stage">
            {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
          </Field>
          <Field label="Assignee">
            {assignee && (
              <span className="flex items-center gap-1.5">
                <InitialsAvatar size="sm" name={assignee.name} color={assignee.color} />
                {assignee.name}
              </span>
            )}
          </Field>
          <Field label="Priority">
            <TaskPriority priority={task.priority} />
          </Field>
          <Field label="Due">
            <TaskDue task={task} />
          </Field>
          <Field label={done ? 'Completed' : 'Created'}>
            {formatDate(
              done && task.completedAt ? task.completedAt : task.createdAt,
              'datetime',
              locale,
            )}
          </Field>
        </dl>

        <section>
          <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Description
          </h3>
          {task.description ? (
            <p className="text-sm whitespace-pre-wrap text-foreground-secondary">
              {task.description}
            </p>
          ) : (
            <p className="text-sm text-foreground-faint">No description.</p>
          )}
        </section>
      </DrawerBody>

      <DrawerFooter className="justify-end">
        {done ? (
          <Button size="sm" variant="outline" onClick={() => move('pending')}>
            <RotateCcwIcon /> Reopen
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={cancelled || setStatus.isPending}
            onClick={() => move('completed')}
          >
            <CheckIcon /> Mark done
          </Button>
        )}
      </DrawerFooter>

      <TaskFormDialog open={editing} onOpenChange={setEditing} task={task} />
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{task.title}” will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteTask.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteTask.isPending}
              onClick={() =>
                deleteTask.mutate(task.id, {
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

function Field({ label, children }: { label: string; children?: React.ReactNode }) {
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

/** Pick a new due date and time without opening the whole form. */
function ReschedulePopover({ taskId, dueAt }: { taskId: string; dueAt: string }) {
  const update = useUpdateTask();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toDateInput(dueAt));
  const [time, setTime] = useState(toTimeInput(dueAt));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = fromDateTimeInputs(date, time);
    if (!next) return;
    update.mutate(
      { id: taskId, patch: { dueAt: next.toISOString() } },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <CalendarClockIcon /> Reschedule
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-date">Due date</Label>
            <Input
              id="reschedule-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reschedule-time">Time</Label>
            <Input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm" disabled={update.isPending}>
            Save
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
