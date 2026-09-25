import { useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon, XIcon } from 'lucide-react';
import { StatusDot } from '@/components/common/status-dot';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/features/auth';
import { useCurrentUser, useWorkspace } from '@/features/workspace';
import { formatRelative } from '@/lib/format';
import type {
  Automation,
  AutomationAction,
  AutomationActionType,
  AutomationTrigger,
  AutomationTriggerType,
  Channel,
  Priority,
  QuoteStatus,
  TaskType,
} from '@/types/domain';
import { useCreateAutomation, useUpdateAutomation } from '../hooks/use-automation-mutations';
import { useAutomationRuns, useAutomations } from '../hooks/use-automations';
import {
  ACTION_LABEL,
  ACTION_TYPES,
  TRIGGER_LABEL,
  TRIGGER_TYPES,
  type LabelRefs,
} from '../utils/automation-labels';

export const NEW_AUTOMATION_ID = 'new';

interface AutomationDrawerProps {
  /** `?automation=` value: an id, `new`, or `null` when closed. */
  automationId: string | null;
  onClose: () => void;
  onDelete: (automationId: string) => void;
}

/** Create or edit one rule. Keyed on the id so the form resets when it changes. */
export function AutomationDrawer({ automationId, onClose, onDelete }: AutomationDrawerProps) {
  const { rows, refs } = useAutomations();
  const automation =
    automationId && automationId !== NEW_AUTOMATION_ID
      ? rows?.find((row) => row.automation.id === automationId)?.automation
      : undefined;
  const ready = automationId === NEW_AUTOMATION_ID || automation !== undefined;

  return (
    <DrawerPanel open={automationId !== null} onOpenChange={(open) => !open && onClose()}>
      {automationId !== null &&
        (ready && refs ? (
          <AutomationForm
            key={automationId}
            automation={automation}
            refs={refs}
            onClose={onClose}
            onDelete={onDelete}
          />
        ) : (
          <DrawerHeader className="gap-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </DrawerHeader>
        ))}
    </DrawerPanel>
  );
}

const ANY = '__any__';
const OWNER = 'owner';
const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'quote', label: 'Quote' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'payment', label: 'Payment' },
  { value: 'general', label: 'General' },
];
const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];
const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'chat', label: 'Web chat' },
];

function defaultTrigger(type: AutomationTriggerType, refs: LabelRefs): AutomationTrigger {
  switch (type) {
    case 'lead_created':
      return { type, source: null };
    case 'lead_stage_changed':
      return { type, stageId: refs.stages[0]?.id ?? null };
    case 'quote_status_changed':
      return { type, status: 'approved' };
    case 'appointment_completed':
      return { type };
  }
}

function defaultAction(type: AutomationActionType, refs: LabelRefs): AutomationAction {
  switch (type) {
    case 'create_task':
      return {
        type,
        title: '',
        taskType: 'follow_up',
        assignee: OWNER,
        dueInDays: 1,
        priority: 'medium',
      };
    case 'move_stage':
      return { type, stageId: refs.stages[0]?.id ?? '' };
    case 'assign_owner':
      return { type, userId: refs.users.find((user) => user.active)?.id ?? '' };
    case 'send_message':
      return { type, channel: 'whatsapp', quickReplyId: refs.quickReplies[0]?.id ?? '' };
    case 'add_note':
      return { type, text: '' };
  }
}

function actionIssue(action: AutomationAction): string | undefined {
  switch (action.type) {
    case 'create_task':
      return action.title.trim() ? undefined : 'Give the task a title.';
    case 'move_stage':
      return action.stageId ? undefined : 'Choose a stage.';
    case 'assign_owner':
      return action.userId ? undefined : 'Choose a member.';
    case 'send_message':
      return action.quickReplyId ? undefined : 'Choose a quick reply.';
    case 'add_note':
      return action.text.trim() ? undefined : 'Write the note.';
  }
}

function AutomationForm({
  automation,
  refs,
  onClose,
  onDelete,
}: {
  automation: Automation | undefined;
  refs: LabelRefs;
  onClose: () => void;
  onDelete: (automationId: string) => void;
}) {
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const currentUser = useCurrentUser().data;
  const sources = useWorkspace().data?.leadSources ?? [];
  const locale = useWorkspace().data?.locale;
  const runs = useAutomationRuns(automation?.id ?? null);
  const [name, setName] = useState(automation?.name ?? '');
  const [active, setActive] = useState(automation?.active ?? true);
  const [trigger, setTrigger] = useState<AutomationTrigger>(
    automation?.trigger ?? defaultTrigger('lead_created', refs),
  );
  const [actions, setActions] = useState<AutomationAction[]>(
    automation?.actions ?? [defaultAction('create_task', refs)],
  );
  const [errors, setErrors] = useState<{
    name?: string | undefined;
    actions: (string | undefined)[];
  }>({ actions: [] });
  const isPending = create.isPending || update.isPending;
  const canManage = useCan('settings.manage');
  const saveError = create.error ?? update.error;
  const members = refs.users.filter((user) => user.active);

  const setAction = (index: number, next: AutomationAction) =>
    setActions((list) => list.map((item, i) => (i === index ? next : item)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      name: name.trim() ? undefined : 'Name the automation.',
      actions: actions.map(actionIssue),
    };
    setErrors(next);
    if (next.name || next.actions.some(Boolean) || actions.length === 0) return;
    const shared = {
      name: name.trim(),
      active,
      trigger,
      actions: actions.map((action) =>
        action.type === 'create_task' ? { ...action, title: action.title.trim() } : action,
      ),
    };
    if (automation) {
      update.mutate({ id: automation.id, patch: shared }, { onSuccess: onClose });
      return;
    }
    create.mutate(
      { ...shared, createdById: currentUser?.id ?? refs.users[0]?.id ?? '', runCount: 0 },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>{automation ? 'Edit automation' : 'New automation'}</DrawerTitle>
        <DrawerDescription>When something happens to a lead, do this.</DrawerDescription>
      </DrawerHeader>
      <DrawerBody className="flex flex-col gap-5">
        <FieldGroup className="gap-3">
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="automation-name">Name</FieldLabel>
            <Input
              id="automation-name"
              autoFocus
              placeholder="e.g. Proposal follow-up"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <label className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">Active</span>
              <span className="text-xs text-muted-foreground">
                Turned off rules keep their history.
              </span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Active" />
          </label>
        </FieldGroup>

        <section className="flex flex-col gap-3 rounded-lg bg-surface-2/60 p-3">
          <h3 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            When this happens
          </h3>
          <Field>
            <FieldLabel htmlFor="automation-trigger">Trigger</FieldLabel>
            <Select
              value={trigger.type}
              onValueChange={(value) =>
                value && setTrigger(defaultTrigger(value as AutomationTriggerType, refs))
              }
              items={TRIGGER_TYPES.map((type) => ({ value: type, label: TRIGGER_LABEL[type] }))}
            >
              <SelectTrigger id="automation-trigger" className="w-full bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRIGGER_LABEL[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {trigger.type === 'lead_created' && (
            <Field>
              <FieldLabel htmlFor="automation-source">From source</FieldLabel>
              <Select
                value={trigger.source ?? ANY}
                onValueChange={(value) =>
                  setTrigger({
                    type: 'lead_created',
                    source: !value || value === ANY ? null : value,
                  })
                }
                items={[
                  { value: ANY, label: 'Any source' },
                  ...sources.map((s) => ({ value: s, label: s })),
                ]}
              >
                <SelectTrigger id="automation-source" className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any source</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {trigger.type === 'lead_stage_changed' && (
            <Field>
              <FieldLabel htmlFor="automation-stage">Into stage</FieldLabel>
              <Select
                value={trigger.stageId ?? ANY}
                onValueChange={(value) =>
                  setTrigger({
                    type: 'lead_stage_changed',
                    stageId: !value || value === ANY ? null : value,
                  })
                }
                items={[
                  { value: ANY, label: 'Any stage' },
                  ...refs.stages.map((s) => ({ value: s.id, label: s.name })),
                ]}
              >
                <SelectTrigger id="automation-stage" className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any stage</SelectItem>
                  {refs.stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {trigger.type === 'quote_status_changed' && (
            <Field>
              <FieldLabel htmlFor="automation-quote-status">New status</FieldLabel>
              <Select
                value={trigger.status}
                onValueChange={(value) =>
                  value &&
                  setTrigger({ type: 'quote_status_changed', status: value as QuoteStatus })
                }
                items={QUOTE_STATUSES}
              >
                <SelectTrigger id="automation-quote-status" className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_STATUSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </section>

        <section className="flex flex-col gap-3 rounded-lg bg-surface-2/60 p-3">
          <h3 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Do this
          </h3>
          {actions.map((action, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2">
                <Select
                  value={action.type}
                  onValueChange={(value) =>
                    value && setAction(index, defaultAction(value as AutomationActionType, refs))
                  }
                  items={ACTION_TYPES.map((type) => ({ value: type, label: ACTION_LABEL[type] }))}
                >
                  <SelectTrigger aria-label={`Action ${index + 1}`} className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {ACTION_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove action ${index + 1}`}
                  disabled={actions.length === 1}
                  onClick={() => setActions((list) => list.filter((_, i) => i !== index))}
                >
                  <XIcon />
                </Button>
              </div>
              <ActionFields
                index={index}
                action={action}
                refs={refs}
                members={members}
                onChange={(next) => setAction(index, next)}
              />
              {errors.actions[index] && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.actions[index]}
                </p>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setActions((list) => [...list, defaultAction('add_note', refs)])}
          >
            <PlusIcon /> Add action
          </Button>
        </section>

        {automation && (
          <section>
            <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
              Recent runs
            </h3>
            {runs.data && runs.data.length > 0 ? (
              <ol className="flex flex-col">
                {runs.data.map((run) => (
                  <li
                    key={run.id}
                    className="flex gap-2.5 border-b border-border-faint py-2 last:border-0"
                  >
                    <StatusDot
                      color={run.status === 'ok' ? 'success' : 'destructive'}
                      className="mt-1.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{run.summary}</p>
                      <p className="truncate text-xs text-foreground-faint">
                        {formatRelative(run.createdAt, undefined, locale)} · {run.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-foreground-faint">No runs yet.</p>
            )}
          </section>
        )}

        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            The automation could not be saved. Try again.
          </p>
        )}
      </DrawerBody>
      <DrawerFooter>
        {automation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={!canManage}
            onClick={() => onDelete(automation.id)}
          >
            <TrashIcon /> Delete
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !canManage}>
          {automation ? 'Save changes' : 'Create automation'}
        </Button>
      </DrawerFooter>
    </form>
  );
}

function ActionFields({
  index,
  action,
  refs,
  members,
  onChange,
}: {
  index: number;
  action: AutomationAction;
  refs: LabelRefs;
  members: LabelRefs['users'];
  onChange: (next: AutomationAction) => void;
}) {
  const id = (name: string) => `action-${index}-${name}`;
  switch (action.type) {
    case 'create_task':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field className="col-span-2">
            <FieldLabel htmlFor={id('title')}>Task title</FieldLabel>
            <Input
              id={id('title')}
              placeholder="e.g. Follow up on the proposal"
              value={action.title}
              onChange={(event) => onChange({ ...action, title: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={id('type')}>Type</FieldLabel>
            <Select
              value={action.taskType}
              onValueChange={(value) =>
                value && onChange({ ...action, taskType: value as TaskType })
              }
              items={TASK_TYPES}
            >
              <SelectTrigger id={id('type')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={id('assignee')}>Assign to</FieldLabel>
            <Select
              value={action.assignee}
              onValueChange={(value) => value && onChange({ ...action, assignee: value })}
              items={[
                { value: OWNER, label: 'The lead’s owner' },
                ...members.map((u) => ({ value: u.id, label: u.name })),
              ]}
            >
              <SelectTrigger id={id('assignee')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OWNER}>The lead’s owner</SelectItem>
                {members.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={id('due')}>Due in days</FieldLabel>
            <Input
              id={id('due')}
              type="number"
              min={0}
              value={String(action.dueInDays)}
              onChange={(event) =>
                onChange({
                  ...action,
                  dueInDays: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={id('priority')}>Priority</FieldLabel>
            <Select
              value={action.priority}
              onValueChange={(value) =>
                value && onChange({ ...action, priority: value as Priority })
              }
              items={PRIORITIES}
            >
              <SelectTrigger id={id('priority')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      );
    case 'move_stage':
      return (
        <Field>
          <FieldLabel htmlFor={id('stage')}>Stage</FieldLabel>
          <Select
            value={action.stageId || null}
            onValueChange={(value) => value && onChange({ ...action, stageId: value })}
            items={refs.stages.map((s) => ({ value: s.id, label: s.name }))}
          >
            <SelectTrigger id={id('stage')} className="w-full">
              <SelectValue placeholder="Choose a stage" />
            </SelectTrigger>
            <SelectContent>
              {refs.stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    case 'assign_owner':
      return (
        <Field>
          <FieldLabel htmlFor={id('owner')}>Member</FieldLabel>
          <Select
            value={action.userId || null}
            onValueChange={(value) => value && onChange({ ...action, userId: value })}
            items={members.map((u) => ({ value: u.id, label: u.name }))}
          >
            <SelectTrigger id={id('owner')} className="w-full">
              <SelectValue placeholder="Choose a member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );
    case 'send_message':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel htmlFor={id('channel')}>Channel</FieldLabel>
            <Select
              value={action.channel}
              onValueChange={(value) => value && onChange({ ...action, channel: value as Channel })}
              items={CHANNELS}
            >
              <SelectTrigger id={id('channel')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={id('reply')}>Quick reply</FieldLabel>
            <Select
              value={action.quickReplyId || null}
              onValueChange={(value) => value && onChange({ ...action, quickReplyId: value })}
              items={refs.quickReplies.map((r) => ({ value: r.id, label: r.title }))}
            >
              <SelectTrigger id={id('reply')} className="w-full">
                <SelectValue placeholder="Choose a template" />
              </SelectTrigger>
              <SelectContent>
                {refs.quickReplies.map((reply) => (
                  <SelectItem key={reply.id} value={reply.id}>
                    {reply.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      );
    case 'add_note':
      return (
        <Field>
          <FieldLabel htmlFor={id('note')}>Note</FieldLabel>
          <Textarea
            id={id('note')}
            rows={2}
            value={action.text}
            onChange={(event) => onChange({ ...action, text: event.target.value })}
          />
        </Field>
      );
  }
}
