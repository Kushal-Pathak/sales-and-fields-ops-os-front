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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser, useUsers } from '@/features/workspace';
import { fromDateTimeInputs, toDateInput, toTimeInput } from '@/lib/dates';
import type { CreateInput, Priority, Task, TaskType, UpdateInput } from '@/types/domain';
import { useCreateTask, useUpdateTask } from '../hooks/use-task-mutations';
import { useLeadOptions } from '../hooks/use-tasks';
import { PRIORITY_LABEL, TASK_TYPE_LABEL, TASK_TYPES } from '../utils/task-labels';

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edits this task instead of creating one. */
  task?: Task | undefined;
  /** Lead preselected for a new task (from the lead drawer). */
  defaultLeadId?: string | undefined;
  /** Prefills for a new task (from the command palette). */
  defaultTitle?: string | undefined;
  defaultType?: TaskType | undefined;
  defaultDueAt?: string | undefined;
  onSaved?: (taskId: string) => void;
}

/** Create or edit a task. The form remounts on every open so it starts clean. */
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultLeadId,
  defaultTitle,
  defaultType,
  defaultDueAt,
  onSaved,
}: TaskFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit task' : 'Add task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details.' : 'Plan the next step, optionally on a lead.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <TaskForm
            task={task}
            defaultLeadId={defaultLeadId}
            defaults={{ title: defaultTitle, type: defaultType, dueAt: defaultDueAt }}
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

type LeadOption = {
  lead: { id: string; title: string; contactId: string };
  contact: { name: string } | undefined;
};

function todayInput(): string {
  return toDateInput(new Date().toISOString());
}

interface TaskDefaults {
  title?: string | undefined;
  type?: TaskType | undefined;
  dueAt?: string | undefined;
}

function TaskForm({
  task,
  defaultLeadId,
  defaults,
  onCancel,
  onSaved,
}: {
  task: Task | undefined;
  defaultLeadId: string | undefined;
  defaults: TaskDefaults;
  onCancel: () => void;
  onSaved: (taskId: string) => void;
}) {
  const users = (useUsers().data ?? []).filter((user) => user.active);
  const currentUser = useCurrentUser().data;
  const leadOptions = (useLeadOptions() ?? []) as LeadOption[];
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const initialLead =
    leadOptions.find((o) => o.lead.id === (task?.leadId ?? defaultLeadId)) ?? null;
  const [title, setTitle] = useState(task?.title ?? defaults.title ?? '');
  const [type, setType] = useState<TaskType>(task?.type ?? defaults.type ?? 'call');
  const [lead, setLead] = useState<LeadOption | null>(initialLead);
  const [assigneeId, setAssigneeId] = useState(
    task?.assigneeId ?? currentUser?.id ?? users[0]?.id ?? '',
  );
  const [date, setDate] = useState(toDateInput(task?.dueAt ?? defaults.dueAt) || todayInput());
  const [time, setTime] = useState(toTimeInput(task?.dueAt ?? defaults.dueAt));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const [description, setDescription] = useState(task?.description ?? '');
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  const isPending = createTask.isPending || updateTask.isPending;
  const saveError = createTask.error ?? updateTask.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: { title?: string; date?: string } = {};
    if (!title.trim()) next.title = 'Enter what needs to be done.';
    const dueAt = fromDateTimeInputs(date, time);
    if (!dueAt) next.date = 'Choose a due date.';
    setErrors(next);
    if (Object.keys(next).length > 0 || !dueAt) return;

    const shared = {
      title: title.trim(),
      type,
      assigneeId,
      dueAt: dueAt.toISOString(),
      priority,
    };
    const desc = description.trim();

    if (task) {
      const patch: UpdateInput<Task> = {
        ...shared,
        description: desc || undefined,
        leadId: lead?.lead.id,
        contactId: lead?.lead.contactId,
      };
      updateTask.mutate({ id: task.id, patch }, { onSuccess: (saved) => onSaved(saved.id) });
      return;
    }

    const input: CreateInput<Task> = {
      ...shared,
      status: 'pending',
      ...(desc && { description: desc }),
      ...(lead && { leadId: lead.lead.id, contactId: lead.lead.contactId }),
    };
    createTask.mutate(input, { onSuccess: (saved) => onSaved(saved.id) });
  };

  const leadLabel = (option: LeadOption) =>
    `${option.contact?.name ?? 'Unknown'} · ${option.lead.title}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="task-title">Task</FieldLabel>
          <Input
            id="task-title"
            autoFocus
            placeholder="e.g. Call back about the proposal"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={errors.title ? true : undefined}
          />
          <FieldError>{errors.title}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="task-lead">Lead</FieldLabel>
          <Combobox
            items={leadOptions}
            value={lead}
            onValueChange={(next: LeadOption | null) => setLead(next)}
            itemToStringLabel={leadLabel}
            isItemEqualToValue={(a: LeadOption, b: LeadOption) => a.lead.id === b.lead.id}
          >
            <ComboboxInput id="task-lead" placeholder="No lead" className="w-full" showClear />
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
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="task-type">Type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => value && setType(value as TaskType)}
              items={TASK_TYPES.map((item) => ({ value: item, label: TASK_TYPE_LABEL[item] }))}
            >
              <SelectTrigger id="task-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {TASK_TYPE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-assignee">Assignee</FieldLabel>
            <Select
              value={assigneeId}
              onValueChange={(value) => value && setAssigneeId(value)}
              items={users.map((user) => ({ value: user.id, label: user.name }))}
            >
              <SelectTrigger id="task-assignee" className="w-full">
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
          <Field data-invalid={errors.date ? true : undefined}>
            <FieldLabel htmlFor="task-date">Due date</FieldLabel>
            <Input
              id="task-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={errors.date ? true : undefined}
            />
            <FieldError>{errors.date}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-time">Time</FieldLabel>
            <Input
              id="task-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-priority">Priority</FieldLabel>
            <Select
              value={priority}
              onValueChange={(value) => value && setPriority(value as Priority)}
              items={(['high', 'medium', 'low'] as Priority[]).map((item) => ({
                value: item,
                label: PRIORITY_LABEL[item],
              }))}
            >
              <SelectTrigger id="task-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['high', 'medium', 'low'] as Priority[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {PRIORITY_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="task-description">Description</FieldLabel>
          <Textarea
            id="task-description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
      </FieldGroup>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          The task could not be saved. Try again.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {task ? 'Save changes' : 'Add task'}
        </Button>
      </DialogFooter>
    </form>
  );
}
