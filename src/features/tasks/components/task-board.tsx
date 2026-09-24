import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ClipboardCheckIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { boardKeyboardCodes, columnKeyboardCoordinates } from '@/lib/dnd-columns';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types/domain';
import { useSetTaskStatus } from '../hooks/use-task-mutations';
import { TASK_STATUS_COLOR, TASK_STATUS_LABEL } from '../utils/task-labels';
import type { TaskRow } from '../utils/task-view-model';
import { TaskDue, TaskTypeLabel } from './task-fields';

const BOARD_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

interface TaskBoardProps {
  rows: TaskRow[] | undefined;
  isPending: boolean;
  error: unknown;
  onOpen: (taskId: string) => void;
  onCreate: () => void;
  onRetry: () => void;
}

/** Tasks by status. Dropping a card on a column sets its status; cancelled tasks stay off the board. */
export function TaskBoard({ rows, isPending, error, onOpen, onCreate, onRetry }: TaskBoardProps) {
  const setStatus = useSetTaskStatus();
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns = useMemo(
    () =>
      BOARD_STATUSES.map((status) => ({
        status,
        rows: (rows ?? []).filter((row) => row.task.status === status),
      })),
    [rows],
  );
  const rowById = useMemo(() => new Map(rows?.map((row) => [row.task.id, row])), [rows]);
  const statusLabel = (id: unknown) => TASK_STATUS_LABEL[id as TaskStatus] ?? 'a column';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
      keyboardCodes: boardKeyboardCodes,
    }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${rowById.get(String(active.id))?.task.title ?? 'task'} from ${statusLabel(active.data.current?.status)}.`,
    onDragOver: ({ over }) => (over ? `Over ${statusLabel(over.id)}.` : 'Not over a column.'),
    onDragEnd: ({ over }) => (over ? `Dropped in ${statusLabel(over.id)}.` : 'Dropped. No change.'),
    onDragCancel: () => 'Move cancelled.',
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const status = over ? (String(over.id) as TaskStatus) : null;
    if (status && status !== active.data.current?.status)
      setStatus.mutate({ id: String(active.id), status });
  };

  if (error)
    return <ErrorState title="Tasks could not be loaded" error={error} onRetry={onRetry} />;
  if (isPending || !rows) return <BoardSkeleton />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="No tasks here"
        hint="Change the view or filters, or add a task."
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> Add task
          </Button>
        }
      />
    );
  }

  const activeRow = activeId ? rowById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Press Space to pick up a task, use the left and right arrow keys to choose a status, and press Space again to drop. Press Escape to cancel. Press Enter to open the task.',
        },
      }}
      onDragStart={({ active }) => setActiveId(String(active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex min-w-max items-start gap-3 p-4">
        {columns.map((column) => (
          <TaskColumn
            key={column.status}
            status={column.status}
            rows={column.rows}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeRow && <TaskCardBody row={activeRow} className="rotate-1 shadow-card" />}
      </DragOverlay>
    </DndContext>
  );
}

function TaskColumn({
  status,
  rows,
  onOpen,
}: {
  status: TaskStatus;
  rows: TaskRow[];
  onOpen: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${TASK_STATUS_LABEL[status]}, ${rows.length} task${rows.length === 1 ? '' : 's'}`}
      className={cn(
        'flex w-64 flex-none flex-col self-stretch rounded-xl p-1 transition-colors',
        isOver && 'bg-accent',
      )}
    >
      <header className="mb-2 flex items-center gap-1.5 px-0.5">
        <StatusBadge color={TASK_STATUS_COLOR[status]}>{TASK_STATUS_LABEL[status]}</StatusBadge>
        <span className="text-xs text-foreground-faint">{rows.length}</span>
      </header>
      <div className="min-h-16 flex-1">
        {rows.map((row) => (
          <TaskCard key={row.task.id} row={row} onOpen={onOpen} />
        ))}
        {rows.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-foreground-faint">No tasks</p>
        )}
      </div>
    </section>
  );
}

function TaskCardBody({ row, className }: { row: TaskRow; className?: string | undefined }) {
  const { task, contact, assignee } = row;
  return (
    <Card size="sm" className={cn('gap-1.5 px-3 py-2.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug font-semibold">{task.title}</span>
        {assignee && (
          <InitialsAvatar
            size="sm"
            name={assignee.name}
            color={assignee.color}
            className="-mt-0.5 size-5 shrink-0"
          />
        )}
      </div>
      {contact && <p className="text-xs text-muted-foreground">{contact.name}</p>}
      <div className="mt-1 flex items-center justify-between border-t border-border-faint pt-2 text-xs">
        <TaskTypeLabel type={task.type} />
        <TaskDue task={task} style="monthDay" className="text-xs" />
      </div>
    </Card>
  );
}

function TaskCard({ row, onOpen }: { row: TaskRow; onOpen: (taskId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.task.id,
    data: { status: row.task.status },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'mb-2 cursor-grab rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      onClick={() => onOpen(row.task.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onOpen(row.task.id);
        }
      }}
      {...attributes}
      {...listeners}
      aria-label={row.task.title}
    >
      <TaskCardBody row={row} className="transition hover:bg-muted hover:shadow-card" />
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex min-w-max items-start gap-3 p-4">
      {BOARD_STATUSES.map((status) => (
        <div key={status} className="flex w-64 flex-col gap-2 p-1">
          <Skeleton className="mb-1 h-5 w-24" />
          {Array.from({ length: 3 }, (_, card) => (
            <Skeleton key={card} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
