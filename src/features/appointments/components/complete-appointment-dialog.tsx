import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import {
  cleanValues,
  CustomFieldInputs,
  useFieldDefinitions,
  validateValues,
  type FieldErrors,
} from '@/features/custom-fields';
import type { Appointment, CustomValues } from '@/types/domain';
import { useCompleteAppointment } from '../hooks/use-appointment-mutations';

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
}

/** Records the outcome of an appointment: notes and the workspace's outcome fields, then Completed. */
export function CompleteAppointmentDialog({
  open,
  onOpenChange,
  appointment,
}: CompleteAppointmentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as completed</DialogTitle>
          <DialogDescription>
            What came out of it? The notes go on the lead's timeline.
          </DialogDescription>
        </DialogHeader>
        {open && <CompleteForm appointment={appointment} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function CompleteForm({ appointment, onDone }: { appointment: Appointment; onDone: () => void }) {
  const complete = useCompleteAppointment();
  const fields = useFieldDefinitions('appointment').data ?? [];
  const [notes, setNotes] = useState(appointment.notes ?? '');
  const [outcome, setOutcome] = useState<CustomValues>({ ...(appointment.outcome ?? {}) });
  const [errors, setErrors] = useState<FieldErrors>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = validateValues(fields, outcome);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    complete.mutate(
      { id: appointment.id, notes, outcome: cleanValues(fields, outcome) },
      { onSuccess: onDone },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <CustomFieldInputs
        fields={fields}
        values={outcome}
        errors={errors}
        idPrefix="appointment-outcome"
        onChange={(key, value) =>
          setOutcome((prev) => {
            const next = { ...prev };
            if (value === undefined) delete next[key];
            else next[key] = value;
            return next;
          })
        }
      />
      <Field>
        <FieldLabel htmlFor="appointment-outcome-notes">Outcome notes</FieldLabel>
        <Textarea
          id="appointment-outcome-notes"
          autoFocus={fields.length === 0}
          rows={4}
          placeholder="Decisions, next steps, anything the team should know."
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      {complete.isError && (
        <p role="alert" className="text-sm text-destructive">
          The appointment could not be updated. Try again.
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={complete.isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={complete.isPending}>
          Mark completed
        </Button>
      </DialogFooter>
    </form>
  );
}
