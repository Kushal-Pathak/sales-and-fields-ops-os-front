import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { ListIcon, PlusIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelines, useStages, useWorkspace } from '@/features/workspace';
import { formatMoney } from '@/lib/format';
import { useMoveLeadStage } from '../hooks/use-lead-mutations';
import { buildBoard, type BoardColumn } from '../utils/board';
import type { LeadRow } from '../utils/lead-view-model';
import { PipelineCardBody } from './pipeline-card';
import { PipelineColumn } from './pipeline-column';

interface PipelineBoardProps {
  rows: LeadRow[] | undefined;
  isPending: boolean;
  error: unknown;
  onOpen: (leadId: string) => void;
  onCreate: (stageId?: string) => void;
  onRetry: () => void;
}

/**
 * Left/Right arrows move a lifted card to the neighbouring column instead of a few pixels.
 * Up/Down are not needed: a card's position inside a column is not modelled.
 */
const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { collisionRect, droppableContainers, droppableRects } = context;
  if (!collisionRect) return undefined;
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return undefined;
  event.preventDefault();

  const columns = droppableContainers
    .getEnabled()
    .map((container) => droppableRects.get(container.id))
    .filter((rect): rect is NonNullable<typeof rect> => rect !== undefined)
    .sort((a, b) => a.left - b.left);
  const centerX = collisionRect.left + collisionRect.width / 2;
  let index = columns.findIndex((rect) => centerX >= rect.left && centerX <= rect.right);
  if (index === -1) index = event.code === 'ArrowRight' ? -1 : columns.length;
  const target = columns[index + (event.code === 'ArrowRight' ? 1 : -1)];
  return target ? { x: target.left + 8, y: collisionRect.top } : undefined;
};

/** The kanban: one column per stage of the default pipeline, cards draggable between them. */
export function PipelineBoard({
  rows,
  isPending,
  error,
  onOpen,
  onCreate,
  onRetry,
}: PipelineBoardProps) {
  const workspace = useWorkspace().data;
  const pipeline = usePipelines().data?.find((item) => item.isDefault);
  const stages = useStages(pipeline?.id).data;
  const moveStage = useMoveLeadStage();
  const [activeId, setActiveId] = useState<string | null>(null);

  const money = (amount: number) =>
    formatMoney(amount, { currency: workspace?.currency ?? 'USD', locale: workspace?.locale });

  const columns = useMemo<BoardColumn[] | undefined>(
    () => (rows && stages && pipeline ? buildBoard(rows, stages, pipeline.id) : undefined),
    [rows, stages, pipeline],
  );
  const rowById = useMemo(() => new Map(rows?.map((row) => [row.lead.id, row])), [rows]);
  const stageName = (id: unknown) => stages?.find((stage) => stage.id === id)?.name ?? 'a stage';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: columnKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${rowById.get(String(active.id))?.contact?.name ?? 'lead'} from ${stageName(active.data.current?.stageId)}.`,
    onDragOver: ({ over }) => (over ? `Over ${stageName(over.id)}.` : 'Not over a stage.'),
    onDragEnd: ({ over }) => (over ? `Dropped in ${stageName(over.id)}.` : 'Dropped. No change.'),
    onDragCancel: () => 'Move cancelled.',
  };

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    const stageId = over ? String(over.id) : null;
    const fromStageId = active.data.current?.stageId as string | undefined;
    if (stageId && stageId !== fromStageId) moveStage.mutate({ id: String(active.id), stageId });
  };

  if (error)
    return <ErrorState title="Pipeline could not be loaded" error={error} onRetry={onRetry} />;

  if (!isPending && rows && rows.length === 0 && columns?.every((c) => c.rows.length === 0)) {
    const total = columns.length;
    if (total === 0) {
      return (
        <EmptyState
          icon={ListIcon}
          title="No stages yet"
          hint="Define the stages of your pipeline in Settings to start using the board."
        />
      );
    }
  }

  if (isPending || !columns) return <BoardSkeleton />;

  if (rows && rows.length === 0 && columns.every((column) => column.rows.length === 0)) {
    // Filters may simply match nothing; still show the columns so the board keeps its shape.
  }

  const activeRow = activeId ? rowById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Press Space to pick up a lead, use the left and right arrow keys to choose a stage, and press Space again to drop. Press Escape to cancel. Press Enter to open the lead.',
        },
      }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex min-w-max items-start gap-3 p-4">
        {columns.map((column) => (
          <PipelineColumn
            key={column.stage.id}
            column={column}
            money={money}
            onOpen={onOpen}
            onCreate={onCreate}
          />
        ))}
        {columns.length === 0 && (
          <EmptyState
            icon={PlusIcon}
            title="No stages yet"
            hint="Define the stages of your pipeline in Settings."
            action={
              <Button size="sm" variant="outline" onClick={() => onCreate()}>
                Add lead
              </Button>
            }
          />
        )}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeRow && (
          <PipelineCardBody row={activeRow} money={money} className="rotate-1 shadow-card" />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex min-w-max items-start gap-3 p-4">
      {Array.from({ length: 4 }, (_, column) => (
        <div key={column} className="flex w-56 flex-col gap-2 p-1">
          <Skeleton className="mb-1 h-5 w-24" />
          {Array.from({ length: 3 }, (_, card) => (
            <Skeleton key={card} className="h-22 w-full rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
