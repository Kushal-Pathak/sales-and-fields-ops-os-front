import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Channel, Message } from '@/types/domain';
import { isWhatsApp } from '../utils/inbox-labels';
import { groupByDay } from '../utils/message-groups';

interface MessageListProps {
  messages: Message[] | undefined;
  channel: Channel;
  className?: string | undefined;
}

/** The transcript: day separators and bubbles, scrolled to the newest message. */
export function MessageList({ messages, channel, className }: MessageListProps) {
  const locale = useWorkspace().data?.locale;
  const endRef = useRef<HTMLDivElement>(null);
  const count = messages?.length ?? 0;

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [count]);

  if (!messages) {
    return (
      <div className={cn('flex flex-col gap-2 p-4', className)}>
        <Skeleton className="h-10 w-2/3 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
        <Skeleton className="h-10 w-3/5 rounded-xl" />
      </div>
    );
  }

  const groups = groupByDay(messages, new Date(), locale);
  const last = messages[messages.length - 1];
  const outgoing = isWhatsApp(channel) ? 'bg-whatsapp-soft' : 'bg-info-soft';

  return (
    <div className={cn('flex flex-col gap-2 bg-surface-2/40 p-4', className)} role="log">
      {groups.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No messages yet.</p>
      )}
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <div className="my-1 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-faint" />
            <span className="text-2xs font-semibold tracking-wider text-foreground-faint uppercase">
              {group.label}
            </span>
            <span className="h-px flex-1 bg-border-faint" />
          </div>
          {group.messages.map((message) => {
            const mine = message.direction === 'outbound';
            return (
              <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[76%] px-3 py-2 text-sm leading-relaxed shadow-xs',
                    mine
                      ? cn(outgoing, 'rounded-[10px_3px_10px_10px]')
                      : 'rounded-[3px_10px_10px_10px] bg-background',
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{message.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-2xs tabular-nums',
                      mine ? 'text-right text-foreground-secondary' : 'text-foreground-faint',
                    )}
                  >
                    {formatDate(message.sentAt, 'time', locale)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      {last?.direction === 'outbound' && (
        <p className="text-center text-2xs text-foreground-faint">Awaiting their reply</p>
      )}
      <div ref={endRef} />
    </div>
  );
}
