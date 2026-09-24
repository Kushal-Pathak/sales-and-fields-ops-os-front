import { useDroppable } from '@dnd-kit/core';
import { PlusIcon } from 'lucide-react';
import { StatusBadge } from '@/components/common/status-badge';
import { cn } from '@/lib/utils';
import type { BoardColumn } from '../utils/board';
import { PipelineCard } from './pipeline-card';

interface PipelineColumnProps {
  column: BoardColumn;
  money: (amount: number) => string;
  onOpen: (leadId: string) => void;
  onCreate: (stageId: string) => void;
}

/** One stage of the board: head with count and value, the cards, and a ghost "Add". */
export function PipelineColumn({ column, money, onOpen, onCreate }: PipelineColumnProps) {
  const { stage, rows, total } = column;
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <section
      ref={setNodeRef}
      aria-label={`${stage.name}, ${rows.length} lead${rows.length === 1 ? '' : 's'}`}
      className={cn(
        'flex w-56 flex-none flex-col self-stretch rounded-xl p-1 transition-colors',
        isOver && 'bg-accent',
      )}
    >
      <header className="mb-2 flex items-center gap-1.5 px-0.5">
        <StatusBadge color={stage.color}>{stage.name}</StatusBadge>
        <span className="text-xs text-foreground-faint">{rows.length}</span>
        <span className="ml-auto text-xs font-semibold text-muted-foreground tabular-nums">
          {total > 0 ? money(total) : ''}
        </span>
      </header>

      <div className="min-h-16 flex-1">
        {rows.map((row) => (
          <PipelineCard key={row.lead.id} row={row} money={money} onOpen={onOpen} />
        ))}
        {rows.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-foreground-faint">No leads</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onCreate(stage.id)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground-faint hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3.5" /> Add
      </button>
    </section>
  );
}
