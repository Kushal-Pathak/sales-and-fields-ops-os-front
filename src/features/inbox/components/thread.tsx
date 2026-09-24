import { useEffect } from 'react';
import { useSendMessage, useMarkRead } from '../hooks/use-inbox-mutations';
import { useThread } from '../hooks/use-thread';
import type { ConversationRow } from '../utils/inbox-view-model';
import { Composer } from './composer';
import { MessageList } from './message-list';

interface ThreadProps {
  row: ConversationRow;
  /** Compact: used inside the lead drawer. */
  compact?: boolean;
}

/** Transcript plus composer for one conversation; opening it clears the unread badge. */
export function Thread({ row, compact = false }: ThreadProps) {
  const { conversation, contact, owner } = row;
  const messages = useThread(conversation.id);
  const send = useSendMessage();
  const markRead = useMarkRead();
  const unread = conversation.unreadCount > 0;
  const markReadMutate = markRead.mutate;

  useEffect(() => {
    if (unread) markReadMutate(conversation.id);
  }, [unread, conversation.id, markReadMutate]);

  return (
    <>
      <MessageList
        messages={messages.data}
        channel={conversation.channel}
        className={
          compact ? 'max-h-80 overflow-y-auto rounded-lg' : 'min-h-0 flex-1 overflow-y-auto'
        }
      />
      <Composer
        channel={conversation.channel}
        context={{ name: contact?.name, company: contact?.company, owner: owner?.name }}
        isSending={send.isPending}
        error={send.error}
        onSend={(body) => send.mutate({ conversationId: conversation.id, body })}
        className={compact ? 'mt-2' : 'm-3 mt-0 flex-none'}
      />
    </>
  );
}
