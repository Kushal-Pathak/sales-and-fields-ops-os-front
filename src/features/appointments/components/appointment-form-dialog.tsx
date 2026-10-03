import { PartialWriteError } from '@/data/errors';
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
import {
  addMinutes,
  fromDateTimeInputs,
  minutesBetween,
  toDateInput,
  toTimeInput,
} from '@/lib/dates';
import type { Appointment, AppointmentType, UpdateInput } from '@/types/domain';
import { useCreateAppointment, useUpdateAppointment } from '../hooks/use-appointment-mutations';
import { useLeadOptions, type LeadOption } from '../hooks/use-appointments';
import {
  APPOINTMENT_TYPE_LABEL,
  APPOINTMENT_TYPES,
  DEFAULT_DURATION,
  DURATIONS,
} from '../utils/appointment-labels';

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, edits this appointment instead of creating one. */
  appointment?: Appointment | undefined;
  /** Lead preselected for a new appointment (from the lead drawer). */
  defaultLeadId?: string | undefined;
  /** Start preselected for a new appointment (from a calendar slot). */
  defaultStartAt?: string | undefined;
  onSaved?: (appointmentId: string) => void;
}

/** Schedule or edit an appointment. The form remounts on every open so it starts clean. */
export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  defaultLeadId,
  defaultStartAt,
  onSaved,
}: AppointmentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Edit appointment' : 'Schedule appointment'}</DialogTitle>
          <DialogDescription>
            {appointment
              ? 'Update the appointment details.'
              : 'Book a meeting, call or visit with a lead.'}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <AppointmentForm
            appointment={appointment}
            defaultLeadId={defaultLeadId}
            defaultStartAt={defaultStartAt}
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

/** Snaps the duration to a listed choice, falling back to the closest one. */
function initialDuration(appointment: Appointment | undefined): number {
  if (!appointment) return DEFAULT_DURATION;
  const minutes = minutesBetween(appointment.startAt, appointment.endAt);
  return DURATIONS.some((d) => d.minutes === minutes)
    ? minutes
    : DURATIONS.reduce((best, d) =>
        Math.abs(d.minutes - minutes) < Math.abs(best.minutes - minutes) ? d : best,
      ).minutes;
}

function AppointmentForm({
  appointment,
  defaultLeadId,
  defaultStartAt,
  onCancel,
  onSaved,
}: {
  appointment: Appointment | undefined;
  defaultLeadId: string | undefined;
  defaultStartAt: string | undefined;
  onCancel: () => void;
  onSaved: (appointmentId: string) => void;
}) {
  const users = (useUsers().data ?? []).filter((user) => user.active);
  const currentUser = useCurrentUser().data;
  const leadOptions = useLeadOptions() ?? [];
  const create = useCreateAppointment();
  const update = useUpdateAppointment();

  const start = appointment?.startAt ?? defaultStartAt;
  const initialLead =
    leadOptions.find((o) => o.lead.id === (appointment?.leadId ?? defaultLeadId)) ?? null;
  const [lead, setLead] = useState<LeadOption | null>(initialLead);
  const [type, setType] = useState<AppointmentType>(appointment?.type ?? 'meeting');
  const [assigneeId, setAssigneeId] = useState(
    appointment?.assigneeId ?? currentUser?.id ?? users[0]?.id ?? '',
  );
  const [date, setDate] = useState(toDateInput(start) || toDateInput(new Date().toISOString()));
  const [time, setTime] = useState(toTimeInput(start, '10:00'));
  const [duration, setDuration] = useState(initialDuration(appointment));
  const [location, setLocation] = useState(appointment?.location ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [errors, setErrors] = useState<{ lead?: string; date?: string }>({});

  const isPending = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: { lead?: string; date?: string } = {};
    if (!lead) next.lead = 'Choose the lead this appointment is for.';
    const startAt = fromDateTimeInputs(date, time);
    if (!startAt) next.date = 'Choose a date and time.';
    setErrors(next);
    if (!lead || !startAt) return;

    const trimmedLocation = location.trim();
    const trimmedNotes = notes.trim();
    const shared = {
      type,
      assigneeId,
      startAt: startAt.toISOString(),
      endAt: addMinutes(startAt, duration).toISOString(),
    };

    if (appointment) {
      const patch: UpdateInput<Appointment> = {
        ...shared,
        leadId: lead.lead.id,
        contactId: lead.lead.contactId,
        location: trimmedLocation || undefined,
        notes: trimmedNotes || undefined,
      };
      update.mutate({ id: appointment.id, patch }, { onSuccess: (saved) => onSaved(saved.id) });
      return;
    }

    create.mutate(
      {
        ...shared,
        leadId: lead.lead.id,
        ...(trimmedLocation && { location: trimmedLocation }),
        ...(trimmedNotes && { notes: trimmedNotes }),
      },
      { onSuccess: (saved) => onSaved(saved.id) },
    );
  };

  const leadLabel = (option: LeadOption) =>
    `${option.contact?.name ?? 'Unknown'} · ${option.lead.title}`;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.lead ? true : undefined}>
          <FieldLabel htmlFor="appointment-lead">Lead</FieldLabel>
          <Combobox
            items={leadOptions}
            value={lead}
            onValueChange={(next: LeadOption | null) => setLead(next)}
            itemToStringLabel={leadLabel}
            isItemEqualToValue={(a: LeadOption, b: LeadOption) => a.lead.id === b.lead.id}
          >
            <ComboboxInput
              id="appointment-lead"
              autoFocus={!initialLead}
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

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="appointment-type">Type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => value && setType(value as AppointmentType)}
              items={APPOINTMENT_TYPES.map((item) => ({
                value: item,
                label: APPOINTMENT_TYPE_LABEL[item],
              }))}
            >
              <SelectTrigger id="appointment-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {APPOINTMENT_TYPE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="appointment-assignee">Assignee</FieldLabel>
            <Select
              value={assigneeId}
              onValueChange={(value) => value && setAssigneeId(value)}
              items={users.map((user) => ({ value: user.id, label: user.name }))}
            >
              <SelectTrigger id="appointment-assignee" className="w-full">
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
            <FieldLabel htmlFor="appointment-date">Date</FieldLabel>
            <Input
              id="appointment-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-invalid={errors.date ? true : undefined}
            />
            <FieldError>{errors.date}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="appointment-time">Start time</FieldLabel>
            <Input
              id="appointment-time"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="appointment-duration">Duration</FieldLabel>
            <Select
              value={String(duration)}
              onValueChange={(value) => value && setDuration(Number(value))}
              items={DURATIONS.map((item) => ({ value: String(item.minutes), label: item.label }))}
            >
              <SelectTrigger id="appointment-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((item) => (
                  <SelectItem key={item.minutes} value={String(item.minutes)}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="appointment-location">Location</FieldLabel>
            <Input
              id="appointment-location"
              placeholder="Address, room or link"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="appointment-notes">Notes</FieldLabel>
          <Textarea
            id="appointment-notes"
            rows={3}
            placeholder="Agenda or anything to prepare."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>

      {saveError && (
        <p role="alert" className="text-sm text-destructive">
          {saveError instanceof PartialWriteError
            ? saveError.message
            : 'The appointment could not be saved. Try again.'}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || saveError instanceof PartialWriteError}>
          {appointment ? 'Save changes' : 'Schedule'}
        </Button>
      </DialogFooter>
    </form>
  );
}
