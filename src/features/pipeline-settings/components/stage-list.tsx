import { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import { ErrorState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import { StatusDot } from '@/components/common/status-dot';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLeads } from '@/features/leads';
import { useStages } from '@/features/workspace';
import { cn } from '@/lib/utils';
import type { Stage } from '@/types/domain';
import { useReorderStages } from '../hooks/use-stage-mutations';
import { reorderStages } from '../utils/stage-order';

interface StageListProps {
  pipelineId: string;
  onEdit: (stageId: string) => void;
  onDelete: (stageId: string) => void;
}

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** The pipeline's stages in order. Drag the handle (or use the row menu) to reorder. */
export function StageList({ pipelineId, onEdit, onDelete }: StageListProps) {
  const stages = useStages(pipelineId);
  const leads = useLeads();
  const reorder = useReorderStages();
  const [activeId, setActiveId] = useState<string | null>(null);

  const leadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of leads.rows ?? []) {
      counts.set(row.lead.stageId, (counts.get(row.lead.stageId) ?? 0) + 1);
    }
    return counts;
  }, [leads.rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const apply = (activeStageId: string, overStageId: string) => {
    const changes = reorderStages(stages.data ?? [], activeStageId, overStageId);
    if (changes.length > 0) reorder.mutate(changes);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (over && active.id !== over.id) apply(String(active.id), String(over.id));
  };

  if (stages.error)
    return <ErrorState error={stages.error} onRetry={() => void stages.refetch()} />;

  const rows = stages.data;

  return (
    <div className="rounded-xl border">
      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <Table containerClassName="overflow-visible rounded-xl" className="min-w-[640px]">
          <TableHeader className="[&_th]:bg-sidebar [&_th:first-child]:rounded-tl-xl [&_th:last-child]:rounded-tr-xl">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={cn(HEAD_CLASS, 'w-8 px-1')}>
                <span className="sr-only">Reorder</span>
              </TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[220px]')}>Stage</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[90px] text-right')}>Leads</TableHead>
              <TableHead className={HEAD_CLASS}>Default task</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[110px]')}>Type</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-10')}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows ? (
              <SortableContext
                items={rows.map((stage) => stage.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((stage, index) => (
                  <StageRow
                    key={stage.id}
                    stage={stage}
                    leadCount={leadCounts.get(stage.id) ?? 0}
                    isFirst={index === 0}
                    isLast={index === rows.length - 1}
                    isDragging={activeId === stage.id}
                    onEdit={() => onEdit(stage.id)}
                    onDelete={() => onDelete(stage.id)}
                    onMoveUp={() => rows[index - 1] && apply(stage.id, rows[index - 1]!.id)}
                    onMoveDown={() => rows[index + 1] && apply(stage.id, rows[index + 1]!.id)}
                  />
                ))}
              </SortableContext>
            ) : (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index} className="border-border-faint hover:bg-transparent">
                  <TableCell className={CELL_CLASS} colSpan={6}>
                    <Skeleton className="h-4 w-1/2" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

interface StageRowProps {
  stage: Stage;
  leadCount: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function StageRow({
  stage,
  leadCount,
  isFirst,
  isLast,
  isDragging,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StageRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: stage.id });

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'border-border-faint bg-background hover:bg-muted',
        isDragging && 'relative z-10 shadow-card',
      )}
    >
      <TableCell className="px-1 py-1.5">
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`Reorder ${stage.name}`}
          className="flex size-6 cursor-grab items-center justify-center rounded-md text-foreground-faint hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 font-semibold hover:underline"
        >
          <StatusDot color={stage.color} className="size-2" />
          {stage.name}
        </button>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-right text-foreground-secondary tabular-nums')}>
        {leadCount}
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'text-foreground-secondary')}>
        {stage.defaultTaskTitle ?? <span className="text-foreground-faint">—</span>}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {stage.kind === 'won' && <StatusBadge color="success">Won</StatusBadge>}
        {stage.kind === 'lost' && <StatusBadge color="destructive">Lost</StatusBadge>}
      </TableCell>
      <TableCell className="px-1 py-1.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${stage.name}`} />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isFirst} onClick={onMoveUp}>
              <ArrowUpIcon /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={isLast} onClick={onMoveDown}>
              <ArrowDownIcon /> Move down
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <TrashIcon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
