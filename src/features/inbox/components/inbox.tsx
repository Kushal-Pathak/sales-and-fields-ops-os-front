import { MessagesSquareIcon, SearchXIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useInboxList } from '../hooks/use-inbox-list';
import { ContextRail } from './context-rail';
import { ConversationList } from './conversation-list';
import { Thread } from './thread';
import { ThreadHeader } from './thread-header';

interface InboxProps {
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
  onClose: () => void;
  onCompose: () => void;
}

/** The three-panel inbox: conversations, the open thread, and the lead context. */
export function Inbox({ selectedId, onSelect, onClose, onCompose }: InboxProps) {
  const list = useInboxList();
  const selected = list.rows?.find((row) => row.conversation.id === selectedId);
  const missing = selectedId !== null && list.rows !== undefined && !selected;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside
        className={cn(
          'w-full flex-none border-r lg:flex lg:w-[300px]',
          selectedId !== null ? 'hidden' : 'flex',
        )}
      >
        <ConversationList
          rows={list.visible}
          counts={list.counts}
          filters={list.filters}
          selectedId={selectedId}
          isPending={list.isPending}
          error={list.error}
          onFiltersChange={list.update}
          onSelect={onSelect}
          onCompose={onCompose}
          onRetry={() => void list.refetch()}
        />
      </aside>

      <section
        aria-label="Conversation"
        className={cn('min-w-0 flex-1 flex-col lg:flex', selectedId !== null ? 'flex' : 'hidden')}
      >
        {selected ? (
          <>
            <ThreadHeader key={selected.conversation.id} row={selected} onBack={onClose} />
            <Thread key={selected.conversation.id} row={selected} />
          </>
        ) : missing ? (
          <EmptyState
            icon={SearchXIcon}
            title="This conversation no longer exists"
            hint="The link may be stale."
            action={
              <Button variant="outline" size="sm" onClick={onClose}>
                Back to inbox
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={MessagesSquareIcon}
            title="Pick a conversation"
            hint="Choose one on the left, or start a new message."
            action={
              <Button size="sm" onClick={onCompose}>
                New message
              </Button>
            }
          />
        )}
      </section>

      {selected && (
        <aside className="hidden w-[248px] flex-none overflow-y-auto border-l xl:block">
          <ContextRail key={selected.conversation.id} row={selected} />
        </aside>
      )}
    </div>
  );
}
