import { useState } from 'react';
import { MessagesSquareIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useConversations } from '../hooks/use-conversations';
import { CHANNEL_LABEL } from '../utils/inbox-labels';
import { NewMessageDialog } from './new-message-dialog';
import { Thread } from './thread';

/**
 * A lead's conversations inside the lead drawer: one pill per channel, the
 * selected thread with its composer, and a way to start a new one.
 */
export function LeadConversationPanel({ leadId }: { leadId: string }) {
  const conversations = useConversations();
  const [composing, setComposing] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);

  const rows = (conversations.rows ?? [])
    .filter((row) => row.lead?.id === leadId)
    .sort((a, b) => b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt));
  const selected = rows.find((row) => row.conversation.id === chosen) ?? rows[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {rows.length > 0 && selected && (
          <Tabs
            value={selected.conversation.id}
            onValueChange={(value) => setChosen(value)}
            className="min-w-0"
          >
            <TabsList className="no-scrollbar h-auto gap-0.5 overflow-x-auto bg-transparent p-0">
              {rows.map(({ conversation }) => (
                <TabsTrigger
                  key={conversation.id}
                  value={conversation.id}
                  className="h-7 gap-1.5 px-2.5 data-active:bg-accent data-active:shadow-none"
                >
                  {CHANNEL_LABEL[conversation.channel]}
                  {conversation.unreadCount > 0 && (
                    <span
                      className={cn(
                        'flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-primary-foreground',
                        conversation.channel === 'whatsapp' && 'bg-whatsapp text-white',
                      )}
                    >
                      {conversation.unreadCount}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setComposing(true)}>
          <PlusIcon /> New message
        </Button>
      </div>

      {conversations.isPending ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : selected ? (
        <>
          <Thread key={selected.conversation.id} row={selected} compact />
          <Link
            to={`/inbox?c=${selected.conversation.id}`}
            className="self-end text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Open in inbox
          </Link>
        </>
      ) : (
        <EmptyState
          icon={MessagesSquareIcon}
          title="No conversations yet"
          hint="Send the first message on any channel."
          className="p-2 pt-4"
        />
      )}

      <NewMessageDialog
        open={composing}
        onOpenChange={setComposing}
        leadId={leadId}
        onStarted={(id) => setChosen(id)}
      />
    </div>
  );
}
