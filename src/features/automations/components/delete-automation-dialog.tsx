import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDeleteAutomation } from '../hooks/use-automation-mutations';
import { useAutomations } from '../hooks/use-automations';

interface DeleteAutomationDialogProps {
  automationId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/** Confirms removing a rule and its run history. */
export function DeleteAutomationDialog({
  automationId,
  onOpenChange,
  onDeleted,
}: DeleteAutomationDialogProps) {
  const automation = useAutomations().rows?.find(
    (row) => row.automation.id === automationId,
  )?.automation;
  const remove = useDeleteAutomation();

  return (
    <AlertDialog open={automationId !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{automation?.name ?? 'this automation'}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The rule stops running and its run history is removed. Tasks, notes and messages it
            already created are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!automation || remove.isPending}
            onClick={() => automation && remove.mutate(automation.id, { onSuccess: onDeleted })}
          >
            Delete automation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
