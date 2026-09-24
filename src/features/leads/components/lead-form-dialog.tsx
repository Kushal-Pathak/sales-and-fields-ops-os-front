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
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useContacts } from '@/features/contacts';
import { useCurrentUser, useStages, useUsers, useWorkspace } from '@/features/workspace';
import { currencySymbol } from '@/lib/format';
import type { Contact, CreateInput, Lead, Priority, UpdateInput } from '@/types/domain';
import { useCreateLead, useUpdateLead } from '../hooks/use-lead-mutations';
import { PRIORITIES, PRIORITY_LABEL } from '../utils/priority';

interface LeadFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this lead instead of creating one. */
  lead?: Lead;
  /** Called with the saved lead's id after a create or edit succeeds. */
  onSaved?: (leadId: string) => void;
  /** Stage preselected for a new lead (e.g. from a board column). */
  defaultStageId?: string | undefined;
}

/** Create or edit a lead. Reset by remounting: the dialog content is keyed on `open`. */
export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
  onSaved,
  defaultStageId,
}: LeadFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit lead' : 'Add lead'}</DialogTitle>
          <DialogDescription>
            {lead ? 'Update the lead details.' : 'Link an existing contact or create a new one.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <LeadForm
            lead={lead}
            defaultStageId={defaultStageId}
            onCancel={() => onOpenChange(false)}
            onSaved={(id) => {
              onOpenChange(false);
              onSaved?.(id);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormState {
  contact: Contact | null;
  newContact: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactCompany: string;
  title: string;
  stageId: string;
  ownerId: string;
  source: string;
  priority: Priority;
  value: string;
  nextAction: string;
  nextActionAt: string;
  notes: string;
}

type FormErrors = Partial<Record<'contact' | 'title' | 'value', string>>;

const HOUR_OF_NEXT_ACTION = 9;

/** `2026-09-23T14:00:00.000Z` → `2026-09-23` in local time, for `<input type="date">`. */
function toDateInput(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromDateInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  date.setHours(HOUR_OF_NEXT_ACTION, 0, 0, 0);
  return date.toISOString();
}

function LeadForm({
  lead,
  defaultStageId,
  onCancel,
  onSaved,
}: {
  lead: Lead | undefined;
  defaultStageId: string | undefined;
  onCancel: () => void;
  onSaved: (leadId: string) => void;
}) {
  const workspace = useWorkspace().data;
  const contacts = useContacts().data ?? [];
  const users = (useUsers().data ?? []).filter((user) => user.active);
  const stages = useStages().data ?? [];
  const currentUser = useCurrentUser().data;
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const sources = workspace?.leadSources ?? [];
  const defaultStage =
    stages.find((stage) => stage.id === defaultStageId) ??
    stages.find((stage) => stage.kind === 'open') ??
    stages[0];

  const [form, setForm] = useState<FormState>(() => ({
    contact: null,
    newContact: false,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactCompany: '',
    title: lead?.title ?? '',
    stageId: lead?.stageId ?? defaultStage?.id ?? '',
    ownerId: lead?.ownerId ?? currentUser?.id ?? users[0]?.id ?? '',
    source: lead?.source ?? sources[0] ?? '',
    priority: lead?.priority ?? 'medium',
    value: lead?.value !== undefined ? String(lead.value) : '',
    nextAction: lead?.nextAction ?? '',
    nextActionAt: toDateInput(lead?.nextActionAt),
    notes: lead?.notes ?? '',
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const patch = (changes: Partial<FormState>) => setForm((prev) => ({ ...prev, ...changes }));

  const isPending = createLead.isPending || updateLead.isPending;
  const saveError = createLead.error ?? updateLead.error;

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (!lead) {
      if (form.newContact && !form.contactName.trim()) next.contact = 'Enter the contact name.';
      if (!form.newContact && !form.contact) next.contact = 'Choose a contact or create a new one.';
    }
    if (!form.title.trim()) next.title = 'Enter what this lead is about.';
    if (form.value.trim() && !(Number(form.value) >= 0)) next.value = 'Enter a positive amount.';
    return next;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const value = form.value.trim() ? Number(form.value) : undefined;
    const nextAction = form.nextAction.trim() || undefined;
    const nextActionAt = fromDateInput(form.nextActionAt);
    const notes = form.notes.trim() || undefined;
    const stage = stages.find((item) => item.id === form.stageId);

    if (lead) {
      const changes: UpdateInput<Lead> = {
        title: form.title.trim(),
        stageId: form.stageId,
        ownerId: form.ownerId,
        source: form.source,
        priority: form.priority,
        value,
        nextAction,
        nextActionAt,
        notes,
      };
      updateLead.mutate(
        { id: lead.id, patch: changes },
        { onSuccess: (saved) => onSaved(saved.id) },
      );
      return;
    }

    const contact: CreateInput<Contact> | { id: string } = form.newContact
      ? {
          name: form.contactName.trim(),
          ...(form.contactPhone.trim() && { phone: form.contactPhone.trim() }),
          ...(form.contactEmail.trim() && { email: form.contactEmail.trim() }),
          ...(form.contactCompany.trim() && { company: form.contactCompany.trim() }),
        }
      : { id: form.contact?.id ?? '' };

    createLead.mutate(
      {
        contact,
        lead: {
          title: form.title.trim(),
          pipelineId: stage?.pipelineId ?? '',
          stageId: form.stageId,
          ownerId: form.ownerId,
          source: form.source,
          priority: form.priority,
          ...(value !== undefined && { value }),
          ...(nextAction && { nextAction }),
          ...(nextActionAt && { nextActionAt }),
          ...(notes && { notes }),
        },
      },
      { onSuccess: (saved) => onSaved(saved.id) },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        {!lead && (
          <>
            <Field data-invalid={errors.contact ? true : undefined}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="lead-contact">Contact</FieldLabel>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    size="sm"
                    checked={form.newContact}
                    onCheckedChange={(checked) => patch({ newContact: checked, contact: null })}
                  />
                  New contact
                </label>
              </div>
              {form.newContact ? (
                <Input
                  id="lead-contact"
                  autoFocus
                  placeholder="Full name"
                  value={form.contactName}
                  onChange={(event) => patch({ contactName: event.target.value })}
                  aria-invalid={errors.contact ? true : undefined}
                />
              ) : (
                <Combobox
                  items={contacts}
                  value={form.contact}
                  onValueChange={(contact) => patch({ contact })}
                  itemToStringLabel={(contact: Contact) => contact.name}
                  isItemEqualToValue={(a: Contact, b: Contact) => a.id === b.id}
                >
                  <ComboboxInput
                    id="lead-contact"
                    autoFocus
                    placeholder="Search contacts"
                    className="w-full"
                    aria-invalid={errors.contact ? true : undefined}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>No contacts found.</ComboboxEmpty>
                    <ComboboxList>
                      {(contact: Contact) => (
                        <ComboboxItem key={contact.id} value={contact}>
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate">{contact.name}</span>
                            {contact.company && (
                              <span className="truncate text-xs text-muted-foreground">
                                {contact.company}
                              </span>
                            )}
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}
              <FieldError>{errors.contact}</FieldError>
            </Field>

            {form.newContact && (
              <div className="grid grid-cols-3 gap-3">
                <Field>
                  <FieldLabel htmlFor="lead-contact-phone">Phone</FieldLabel>
                  <Input
                    id="lead-contact-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(event) => patch({ contactPhone: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-contact-email">Email</FieldLabel>
                  <Input
                    id="lead-contact-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => patch({ contactEmail: event.target.value })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lead-contact-company">Company</FieldLabel>
                  <Input
                    id="lead-contact-company"
                    value={form.contactCompany}
                    onChange={(event) => patch({ contactCompany: event.target.value })}
                  />
                </Field>
              </div>
            )}
          </>
        )}

        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="lead-title">Lead</FieldLabel>
          <Input
            id="lead-title"
            autoFocus={Boolean(lead)}
            placeholder="What does the contact want?"
            value={form.title}
            onChange={(event) => patch({ title: event.target.value })}
            aria-invalid={errors.title ? true : undefined}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="lead-stage">Stage</FieldLabel>
            <Select
              value={form.stageId}
              onValueChange={(stageId) => stageId && patch({ stageId })}
              items={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
            >
              <SelectTrigger id="lead-stage" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="lead-owner">Owner</FieldLabel>
            <Select
              value={form.ownerId}
              onValueChange={(ownerId) => ownerId && patch({ ownerId })}
              items={users.map((user) => ({ value: user.id, label: user.name }))}
            >
              <SelectTrigger id="lead-owner" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="lead-source">Source</FieldLabel>
            <Select
              value={form.source}
              onValueChange={(source) => source && patch({ source })}
              items={sources.map((source) => ({ value: source, label: source }))}
            >
              <SelectTrigger id="lead-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="lead-priority">Priority</FieldLabel>
            <Select
              value={form.priority}
              onValueChange={(priority) => priority && patch({ priority: priority as Priority })}
              items={PRIORITIES.map((priority) => ({
                value: priority,
                label: PRIORITY_LABEL[priority],
              }))}
            >
              <SelectTrigger id="lead-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABEL[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field data-invalid={errors.value ? true : undefined}>
            <FieldLabel htmlFor="lead-value">Value</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                {currencySymbol(workspace?.currency ?? 'USD', workspace?.locale)}
              </InputGroupAddon>
              <InputGroupInput
                id="lead-value"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={form.value}
                onChange={(event) => patch({ value: event.target.value })}
                aria-invalid={errors.value ? true : undefined}
              />
            </InputGroup>
            <FieldError>{errors.value}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="lead-next-action-at">Next action date</FieldLabel>
            <Input
              id="lead-next-action-at"
              type="date"
              value={form.nextActionAt}
              onChange={(event) => patch({ nextActionAt: event.target.value })}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="lead-next-action">Next action</FieldLabel>
          <Input
            id="lead-next-action"
            placeholder="e.g. Send proposal"
            value={form.nextAction}
            onChange={(event) => patch({ nextAction: event.target.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="lead-notes">Notes</FieldLabel>
          <Textarea
            id="lead-notes"
            rows={3}
            value={form.notes}
            onChange={(event) => patch({ notes: event.target.value })}
          />
        </Field>
      </FieldGroup>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          The lead could not be saved. Try again.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {lead ? 'Save changes' : 'Add lead'}
        </Button>
      </DialogFooter>
    </form>
  );
}
