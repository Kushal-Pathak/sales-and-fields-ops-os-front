import { useState } from 'react';
import { UserMinusIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeactivateMember } from '../hooks/use-team-mutations';
import type { MemberRow } from '../utils/team-model';

interface DeactivateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: MemberRow;
  /** Other active members who can take over. */
  candidates: MemberRow[];
  onDone: () => void;
}

/** Confirms deactivation and, when the member still has open work, asks who takes it over. */
export function DeactivateMemberDialog({
  open,
  onOpenChange,
  row,
  candidates,
  onDone,
}: DeactivateMemberDialogProps) {
  const deactivate = useDeactivateMember();
  const [target, setTarget] = useState<string | null>(null);
  // Unknown task counts (Tasks closed to the viewer) still need someone to take them over.
  const tasksUnknown = row.openTasks === null;
  const openTasks = row.openTasks ?? 0;
  const hasWork = row.openLeads > 0 || openTasks > 0 || tasksUnknown;
  const reassignTo = target ?? candidates[0]?.user.id ?? null;
  const work = [
    row.openLeads > 0 && `${row.openLeads} open lead${row.openLeads === 1 ? '' : 's'}`,
    openTasks > 0 && `${openTasks} open task${openTasks === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-danger-soft text-destructive">
            <UserMinusIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Deactivate {row.user.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {work
              ? `${row.user.name} has ${work}. Choose who takes them over. They can be reactivated later.`
              : hasWork
                ? `Choose who takes over any open work ${row.user.name} still has. They can be reactivated later.`
                : `${row.user.name} will no longer appear in pickers. They can be reactivated later.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {hasWork && (
          <Field>
            <FieldLabel htmlFor="reassign-to">Reassign to</FieldLabel>
            <Select
              value={reassignTo}
              onValueChange={(value) => setTarget(value)}
              items={candidates.map((c) => ({ value: c.user.id, label: c.user.name }))}
            >
              <SelectTrigger id="reassign-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.user.id} value={candidate.user.id}>
                    {candidate.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {deactivate.isError && (
          <p className="text-sm text-destructive">
            The member could not be deactivated. Try again.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deactivate.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deactivate.isPending || (hasWork && !reassignTo)}
            onClick={() =>
              deactivate.mutate(
                { id: row.user.id, reassignToId: hasWork ? reassignTo : null },
                {
                  onSuccess: () => {
                    onOpenChange(false);
                    onDone();
                  },
                },
              )
            }
          >
            {hasWork ? 'Reassign and deactivate' : 'Deactivate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
