import { TrashIcon } from 'lucide-react';
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
import { useDeleteLead } from '../hooks/use-lead-mutations';
import { useLeadAppointments, useLeadQuotes, useLeadTasks } from '../hooks/use-lead-related';
import type { LeadRow } from '../utils/lead-view-model';

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: LeadRow;
  onDeleted: () => void;
}

/** Confirms deleting a lead and spells out what goes with it. */
export function DeleteLeadDialog({ open, onOpenChange, row, onDeleted }: DeleteLeadDialogProps) {
  const deleteLead = useDeleteLead();
  const tasks = useLeadTasks(row.lead.id).data?.length ?? 0;
  const quotes = useLeadQuotes(row.lead.id).data?.length ?? 0;
  const appointments = useLeadAppointments(row.lead.id).data?.length ?? 0;

  const cascade = [
    tasks && `${tasks} task${tasks === 1 ? '' : 's'}`,
    quotes && `${quotes} quote${quotes === 1 ? '' : 's'}`,
    appointments && `${appointments} appointment${appointments === 1 ? '' : 's'}`,
  ].filter(Boolean);

  const confirm = () => {
    deleteLead.mutate(row.lead.id, {
      onSuccess: () => {
        onOpenChange(false);
        onDeleted();
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-danger-soft text-destructive">
            <TrashIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
          <AlertDialogDescription>
            “{row.lead.title}” for {row.contact?.name ?? 'this contact'} will be removed
            {cascade.length > 0 ? ` along with its ${cascade.join(', ')}` : ''} and its activity
            log. The contact stays. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteLead.isError && (
          <p className="text-sm text-destructive">The lead could not be deleted. Try again.</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteLead.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteLead.isPending}
            onClick={confirm}
          >
            Delete lead
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
