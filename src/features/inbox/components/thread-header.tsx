import { ArrowLeftIcon, ExternalLinkIcon, MailOpenIcon, MoreHorizontalIcon } from 'lucide-react';
import { Link } from 'react-router';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarkUnread } from '../hooks/use-inbox-mutations';
import type { ConversationRow } from '../utils/inbox-view-model';
import { ChannelBadge } from './channel-badge';

interface ThreadHeaderProps {
  row: ConversationRow;
  /** Narrow screens: go back to the list. */
  onBack: () => void;
}

/** Who the thread is with, on which channel, and the actions on it. */
export function ThreadHeader({ row, onBack }: ThreadHeaderProps) {
  const { conversation, contact, lead, stage } = row;
  const markUnread = useMarkUnread();
  const name = contact?.name ?? 'Unknown contact';
  const reach = conversation.channel === 'email' ? contact?.email : contact?.phone;

  return (
    <div className="flex flex-none items-center gap-2.5 border-b px-3 py-2.5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Back to conversations"
        onClick={onBack}
      >
        <ArrowLeftIcon />
      </Button>
      <InitialsAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <ChannelBadge channel={conversation.channel} withLabel />
          {reach && <span>· {reach}</span>}
          {lead && <span className="hidden truncate sm:inline">· {lead.title}</span>}
        </p>
      </div>
      {stage && (
        <StatusBadge color={stage.color} className="hidden sm:inline-flex">
          {stage.name}
        </StatusBadge>
      )}
      {lead && (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link to={`/leads?lead=${lead.id}`} />}
        >
          <ExternalLinkIcon /> Open lead
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => markUnread.mutate(conversation.id)}>
            <MailOpenIcon /> Mark as unread
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
