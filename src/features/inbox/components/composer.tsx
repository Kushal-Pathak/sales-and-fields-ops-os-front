import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDownIcon, SendIcon, ZapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useWorkspace } from '@/features/workspace';
import { cn } from '@/lib/utils';
import type { Channel } from '@/types/domain';
import { CHANNEL_LABEL, isWhatsApp } from '../utils/inbox-labels';
import { fillTemplate, type TemplateContext } from '@/lib/templates';

interface ComposerProps {
  channel: Channel;
  context: TemplateContext;
  isSending: boolean;
  error: unknown;
  onSend: (body: string) => void;
  className?: string | undefined;
}

const MAX_ROWS = 6;
const LINE_HEIGHT = 20;

/** The reply box: growing textarea, quick replies, Enter to send. */
export function Composer({ channel, context, isSending, error, onSend, className }: ComposerProps) {
  const [body, setBody] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  const quickReplies = useWorkspace().data?.quickReplies ?? [];

  const resize = () => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS * LINE_HEIGHT + 16)}px`;
  };

  const send = () => {
    if (!body.trim() || isSending) return;
    onSend(body.trim());
    setBody('');
    requestAnimationFrame(resize);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const insert = (template: string) => {
    const text = fillTemplate(template, context);
    setBody((current) => (current.trim() ? `${current.trimEnd()}\n${text}` : text));
    requestAnimationFrame(() => {
      resize();
      textarea.current?.focus();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border-strong bg-background p-2',
        className,
      )}
    >
      {quickReplies.length > 0 && (
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="rounded-full bg-surface-2"
                />
              }
            >
              <ZapIcon /> Quick reply <ChevronDownIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Insert a template</DropdownMenuLabel>
                {quickReplies.map((reply) => (
                  <DropdownMenuItem key={reply.id} onClick={() => insert(reply.body)}>
                    {reply.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      <Textarea
        ref={textarea}
        aria-label="Message"
        placeholder={`Reply on ${CHANNEL_LABEL[channel]}…`}
        rows={1}
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          resize();
        }}
        onKeyDown={onKeyDown}
        className="min-h-9 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
      />
      <div className="flex items-center gap-2">
        <span className="text-2xs text-foreground-faint">
          Enter to send · Shift+Enter for a new line
        </span>
        {error ? (
          <span role="alert" className="text-xs text-destructive">
            The message could not be sent.
          </span>
        ) : null}
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || isSending}
          className={cn(
            'ml-auto',
            isWhatsApp(channel) && 'bg-whatsapp text-white hover:bg-whatsapp/90',
          )}
        >
          <SendIcon /> Send
        </Button>
      </div>
    </form>
  );
}
