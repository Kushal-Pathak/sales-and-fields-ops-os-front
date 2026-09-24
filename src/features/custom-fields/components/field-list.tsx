import { useState } from 'react';
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
  PlusIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
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
import { cn } from '@/lib/utils';
import type { FieldDefinition, FieldEntity } from '@/types/domain';
import { useFieldDefinitions } from '../hooks/use-field-definitions';
import { useReorderFields, type FieldOrder } from '../hooks/use-field-mutations';
import { ENTITY_HINT, FIELD_TYPE_ICON, FIELD_TYPE_LABEL } from '../utils/field-labels';

interface FieldListProps {
  entity: FieldEntity;
  onEdit: (fieldId: string) => void;
  onDelete: (fieldId: string) => void;
  onCreate: () => void;
}

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** Moves `activeId` to `overId`'s position and renumbers 0..n-1; returns only what changed. */
function reorderFields(fields: FieldDefinition[], activeId: string, overId: string): FieldOrder[] {
  const from = fields.findIndex((field) => field.id === activeId);
  const to = fields.findIndex((field) => field.id === overId);
  if (from === -1 || to === -1 || from === to) return [];
  const moved = [...fields];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item!);
  return moved
    .map((field, order) => ({ id: field.id, order, previous: field.order }))
    .filter((entry) => entry.order !== entry.previous)
    .map(({ id, order }) => ({ id, order }));
}

/** One record type's custom fields in order. Drag the handle (or use the row menu) to reorder. */
export function FieldList({ entity, onEdit, onDelete, onCreate }: FieldListProps) {
  const fields = useFieldDefinitions(entity);
  const reorder = useReorderFields();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const apply = (active: string, over: string) => {
    const changes = reorderFields(fields.data ?? [], active, over);
    if (changes.length > 0) reorder.mutate(changes);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (over && active.id !== over.id) apply(String(active.id), String(over.id));
  };

  if (fields.error)
    return <ErrorState error={fields.error} onRetry={() => void fields.refetch()} />;

  const rows = fields.data;
  if (rows && rows.length === 0) {
    return (
      <EmptyState
        icon={SlidersHorizontalIcon}
        title="No custom fields yet"
        hint={ENTITY_HINT[entity]}
        action={
          <Button size="sm" onClick={onCreate}>
            <PlusIcon /> Add field
          </Button>
        }
      />
    );
  }

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
              <TableHead className={cn(HEAD_CLASS, 'w-[240px]')}>Field</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[200px]')}>Key</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[140px]')}>Type</TableHead>
              <TableHead className={HEAD_CLASS}>Options</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-10')}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows ? (
              <SortableContext
                items={rows.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((field, index) => (
                  <FieldRow
                    key={field.id}
                    field={field}
                    isFirst={index === 0}
                    isLast={index === rows.length - 1}
                    isDragging={activeId === field.id}
                    onEdit={() => onEdit(field.id)}
                    onDelete={() => onDelete(field.id)}
                    onMoveUp={() => rows[index - 1] && apply(field.id, rows[index - 1]!.id)}
                    onMoveDown={() => rows[index + 1] && apply(field.id, rows[index + 1]!.id)}
                  />
                ))}
              </SortableContext>
            ) : (
              Array.from({ length: 4 }, (_, index) => (
                <TableRow key={index} className="border-border-faint hover:bg-transparent">
                  <TableCell className={CELL_CLASS} colSpan={6}>
                    <Skeleton className="h-4 w-1/2" />
                  </TableCell>
                </TableRow>
              ))
            )}
            {rows && (
              <TableRow className="border-0 hover:bg-muted">
                <TableCell colSpan={6} className="p-0">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" /> Add field
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </DndContext>
    </div>
  );
}

interface FieldRowProps {
  field: FieldDefinition;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldRow({
  field,
  isFirst,
  isLast,
  isDragging,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: FieldRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } =
    useSortable({ id: field.id });
  const Icon = FIELD_TYPE_ICON[field.type];

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
          aria-label={`Reorder ${field.label}`}
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
          {field.label}
          {field.required && <StatusBadge color="warning">Required</StatusBadge>}
        </button>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'font-mono text-xs text-foreground-secondary')}>
        {field.key}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        <span className="flex items-center gap-1.5 text-foreground-secondary">
          <Icon className="size-3.5" /> {FIELD_TYPE_LABEL[field.type]}
        </span>
      </TableCell>
      <TableCell className={cn(CELL_CLASS, 'max-w-[280px] truncate text-foreground-secondary')}>
        {field.type === 'select' ? (
          (field.options ?? []).join(', ')
        ) : (
          <span className="text-foreground-faint">{field.hint ?? '—'}</span>
        )}
      </TableCell>
      <TableCell className="px-1 py-1.5 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs" aria-label={`Actions for ${field.label}`} />
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
