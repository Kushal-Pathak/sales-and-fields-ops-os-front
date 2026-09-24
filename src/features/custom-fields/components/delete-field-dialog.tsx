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
import { useFieldDefinitions } from '../hooks/use-field-definitions';
import { useDeleteField } from '../hooks/use-field-mutations';

interface DeleteFieldDialogProps {
  fieldId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/** Confirms removing a field definition. Stored values stay on the records but stop showing. */
export function DeleteFieldDialog({ fieldId, onOpenChange, onDeleted }: DeleteFieldDialogProps) {
  const field = useFieldDefinitions().data?.find((row) => row.id === fieldId);
  const remove = useDeleteField();

  return (
    <AlertDialog open={fieldId !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{field?.label ?? 'this field'}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The field disappears from forms and records. Values already saved are kept but no longer
            shown.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!field || remove.isPending}
            onClick={() => field && remove.mutate(field.id, { onSuccess: onDeleted })}
          >
            Delete field
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
