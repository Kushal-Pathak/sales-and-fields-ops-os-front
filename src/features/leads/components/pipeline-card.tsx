import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusDot } from '@/components/common/status-dot';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LeadRow } from '../utils/lead-view-model';

interface PipelineCardBodyProps {
  row: LeadRow;
  money: (amount: number) => string;
  className?: string | undefined;
}

/** The card's content; used both in the column and inside the drag overlay. */
export function PipelineCardBody({ row, money, className }: PipelineCardBodyProps) {
  const { lead, contact, owner } = row;
  return (
    <Card size="sm" className={cn('gap-1.5 px-3 py-2.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm leading-snug font-semibold">{contact?.name ?? '—'}</span>
        {owner && (
          <InitialsAvatar
            size="sm"
            name={owner.name}
            color={owner.color}
            className="-mt-0.5 size-5 shrink-0"
          />
        )}
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{lead.title}</p>
      <div className="mt-1 flex items-center justify-between border-t border-border-faint pt-2 text-xs">
        <span className="flex items-center gap-1.5 text-foreground-secondary">
          <StatusDot color="neutral" /> {lead.source}
        </span>
        <span className="font-bold tabular-nums">
          {lead.value !== undefined ? money(lead.value) : ''}
        </span>
      </div>
    </Card>
  );
}

interface PipelineCardProps extends PipelineCardBodyProps {
  onOpen: (leadId: string) => void;
}

/** A draggable card. Click or Enter opens the drawer; Space (or a 6px drag) lifts it. */
export function PipelineCard({ row, money, onOpen }: PipelineCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.lead.id,
    data: { stageId: row.lead.stageId },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        'mb-2 cursor-grab rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      onClick={() => onOpen(row.lead.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onOpen(row.lead.id);
        }
      }}
      {...attributes}
      {...listeners}
      aria-label={`${row.contact?.name ?? 'Lead'}: ${row.lead.title}`}
    >
      <PipelineCardBody
        row={row}
        money={money}
        className="transition hover:bg-muted hover:shadow-card"
      />
    </div>
  );
}
