import { InboxIcon, PenSquareIcon } from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { FilterChip, SearchField } from '@/components/common/list-toolbar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/features/workspace';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Channel } from '@/types/domain';
import {
  INBOX_VIEW_LABEL,
  INBOX_VIEWS,
  type InboxFilters,
  type InboxView,
} from '../utils/inbox-filters';
import { CHANNEL_LABEL, CHANNELS, isWhatsApp } from '../utils/inbox-labels';
import type { ConversationRow } from '../utils/inbox-view-model';
import { ChannelBadge } from './channel-badge';

interface ConversationListProps {
  rows: ConversationRow[] | undefined;
  counts: Record<InboxView, number> | undefined;
  filters: InboxFilters;
  selectedId: string | null;
  isPending: boolean;
  error: unknown;
  onFiltersChange: (patch: Partial<InboxFilters>) => void;
  onSelect: (conversationId: string) => void;
  onCompose: () => void;
  onRetry: () => void;
}

/** The left panel: search, view tabs, channel filter and one row per conversation. */
export function ConversationList({
  rows,
  counts,
  filters,
  selectedId,
  isPending,
  error,
  onFiltersChange,
  onSelect,
  onCompose,
  onRetry,
}: ConversationListProps) {
  const locale = useWorkspace().data?.locale;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex flex-none flex-col gap-2 border-b p-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold">Inbox</h1>
          <Button
            variant="outline"
            size="icon-sm"
            className="ml-auto"
            aria-label="New message"
            onClick={onCompose}
          >
            <PenSquareIcon />
          </Button>
        </div>
        <SearchField
          value={filters.q}
          onChange={(q) => onFiltersChange({ q })}
          placeholder="Search messages"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Tabs
            value={filters.view}
            onValueChange={(view) => onFiltersChange({ view: view as InboxView })}
          >
            <TabsList className="h-auto gap-0.5 bg-transparent p-0">
              {INBOX_VIEWS.map((view) => (
                <TabsTrigger
                  key={view}
                  value={view}
                  className="h-6 gap-1 px-2 text-xs data-active:bg-accent data-active:shadow-none"
                >
                  {INBOX_VIEW_LABEL[view]}
                  {counts && (
                    <span
                      className={
                        view === 'unread' && counts[view] > 0
                          ? 'font-semibold text-whatsapp'
                          : 'text-foreground-faint'
                      }
                    >
                      {counts[view]}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <FilterChip
            label="Channel"
            anyLabel="any"
            value={filters.channel}
            items={CHANNELS.map((channel) => ({ value: channel, label: CHANNEL_LABEL[channel] }))}
            onChange={(channel) => onFiltersChange({ channel: channel as Channel | null })}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <ErrorState title="Conversations could not be loaded" error={error} onRetry={onRetry} />
        ) : isPending || !rows ? (
          <ul>
            {Array.from({ length: 6 }, (_, index) => (
              <li key={index} className="flex gap-2.5 border-b border-border-faint px-3 py-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="No conversations"
            hint={
              filters.q || filters.channel || filters.view !== 'all'
                ? 'Try another view, search or channel.'
                : 'Start one from a lead or with the pen button above.'
            }
          />
        ) : (
          <ul>
            {rows.map(({ conversation, contact, stage, lastMessage }) => {
              const selected = conversation.id === selectedId;
              const unread = conversation.unreadCount > 0;
              const name = contact?.name ?? 'Unknown contact';
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    aria-label={`Open conversation with ${name}`}
                    aria-current={selected ? 'true' : undefined}
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      'flex w-full cursor-pointer items-start gap-2.5 border-b border-border-faint px-3 py-2.5 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                      selected && 'bg-surface-2 hover:bg-surface-2',
                    )}
                  >
                    <span className="relative shrink-0">
                      <InitialsAvatar name={name} />
                      <ChannelBadge
                        channel={conversation.channel}
                        className="absolute -right-0.5 -bottom-0.5"
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline gap-2">
                        <span
                          className={cn('truncate text-sm', unread ? 'font-bold' : 'font-semibold')}
                        >
                          {name}
                        </span>
                        <span className="ml-auto shrink-0 text-2xs text-foreground-faint">
                          {formatRelative(conversation.lastMessageAt, undefined, locale)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'truncate text-xs',
                          unread ? 'font-medium text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {lastMessage
                          ? `${lastMessage.direction === 'outbound' ? 'You: ' : ''}${lastMessage.body}`
                          : 'No messages yet'}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
                        {unread && (
                          <span
                            aria-label={`${conversation.unreadCount} unread`}
                            className={cn(
                              'ml-auto flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-2xs font-bold text-primary-foreground',
                              isWhatsApp(conversation.channel)
                                ? 'bg-whatsapp text-white'
                                : 'bg-primary',
                            )}
                          >
                            {conversation.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
