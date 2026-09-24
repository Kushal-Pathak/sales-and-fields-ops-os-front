import { useState, type FormEvent } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Channel } from '@/types/domain';
import { useStartConversation } from '../hooks/use-inbox-mutations';
import { useLeadOptions, type LeadOption } from '../hooks/use-conversations';
import { CHANNEL_LABEL, CHANNELS } from '../utils/inbox-labels';

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixes the lead (from the lead drawer); the picker is hidden. */
  leadId?: string | undefined;
  onStarted: (conversationId: string) => void;
}

/** Start (or continue) a conversation with a lead on a channel. */
export function NewMessageDialog({ open, onOpenChange, leadId, onStarted }: NewMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>
            Sends the first message and opens the thread. An existing thread on the same channel is
            continued.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <NewMessageForm
            leadId={leadId}
            onCancel={() => onOpenChange(false)}
            onStarted={(id) => {
              onOpenChange(false);
              onStarted(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewMessageForm({
  leadId,
  onCancel,
  onStarted,
}: {
  leadId: string | undefined;
  onCancel: () => void;
  onStarted: (conversationId: string) => void;
}) {
  const leadOptions = useLeadOptions() ?? [];
  const start = useStartConversation();
  const [lead, setLead] = useState<LeadOption | null>(
    () => leadOptions.find((option) => option.lead.id === leadId) ?? null,
  );
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ lead?: string; body?: string }>({});
  const chosenLeadId = leadId ?? lead?.lead.id;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: { lead?: string; body?: string } = {};
    if (!chosenLeadId) next.lead = 'Choose who to message.';
    if (!body.trim()) next.body = 'Type a message.';
    setErrors(next);
    if (!chosenLeadId || !body.trim()) return;
    start.mutate({ leadId: chosenLeadId, channel, body }, { onSuccess: onStarted });
  };

  const leadLabel = (option: LeadOption) =>
    `${option.contact?.name ?? 'Unknown'} · ${option.lead.title}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        {!leadId && (
          <Field data-invalid={errors.lead ? true : undefined}>
            <FieldLabel htmlFor="message-lead">Lead</FieldLabel>
            <Combobox
              items={leadOptions}
              value={lead}
              onValueChange={(next: LeadOption | null) => setLead(next)}
              itemToStringLabel={leadLabel}
              isItemEqualToValue={(a: LeadOption, b: LeadOption) => a.lead.id === b.lead.id}
            >
              <ComboboxInput
                id="message-lead"
                autoFocus
                placeholder="Choose a lead"
                className="w-full"
                showClear
                aria-invalid={errors.lead ? true : undefined}
              />
              <ComboboxContent>
                <ComboboxEmpty>No leads found.</ComboboxEmpty>
                <ComboboxList>
                  {(option: LeadOption) => (
                    <ComboboxItem key={option.lead.id} value={option}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.contact?.name ?? 'Unknown'}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {option.lead.title}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError>{errors.lead}</FieldError>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="message-channel">Channel</FieldLabel>
          <Select
            value={channel}
            onValueChange={(value) => value && setChannel(value as Channel)}
            items={CHANNELS.map((item) => ({ value: item, label: CHANNEL_LABEL[item] }))}
          >
            <SelectTrigger id="message-channel" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNELS.map((item) => (
                <SelectItem key={item} value={item}>
                  {CHANNEL_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid={errors.body ? true : undefined}>
          <FieldLabel htmlFor="message-body">Message</FieldLabel>
          <Textarea
            id="message-body"
            rows={4}
            autoFocus={Boolean(leadId)}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            aria-invalid={errors.body ? true : undefined}
          />
          <FieldError>{errors.body}</FieldError>
        </Field>
      </FieldGroup>
      {start.isError && (
        <p role="alert" className="text-sm text-destructive">
          The message could not be sent. Try again.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={start.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={start.isPending}>
          Send
        </Button>
      </DialogFooter>
    </form>
  );
}
