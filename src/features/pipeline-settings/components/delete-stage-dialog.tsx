import { useState } from 'react';
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
import { Field, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLeads } from '@/features/leads';
import { useStages } from '@/features/workspace';
import { useDeleteStage } from '../hooks/use-stage-mutations';
import { canDeleteStage, moveTargets } from '../utils/stage-order';

interface DeleteStageDialogProps {
  /** The stage to delete, or `null` when closed. */
  stageId: string | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

/** Confirms deleting a stage; when it holds leads, asks where they should go first. */
export function DeleteStageDialog({ stageId, onOpenChange, onDeleted }: DeleteStageDialogProps) {
  return (
    <AlertDialog open={stageId !== null} onOpenChange={onOpenChange}>
      {stageId !== null && (
        <DeleteStageContent key={stageId} stageId={stageId} onDeleted={onDeleted} />
      )}
    </AlertDialog>
  );
}

function DeleteStageContent({ stageId, onDeleted }: { stageId: string; onDeleted: () => void }) {
  const stages = useStages().data ?? [];
  const stage = stages.find((item) => item.id === stageId);
  const leads = useLeads().rows?.filter((row) => row.lead.stageId === stageId) ?? [];
  const deleteStage = useDeleteStage();

  const targets = stage ? moveTargets(stage, stages) : [];
  const [target, setTarget] = useState<string | null>(null);
  const moveTo = target ?? targets[0]?.id ?? null;
  const allowed = stage
    ? canDeleteStage(stage, stages)
    : { ok: false as const, reason: 'Stage not found.' };

  const confirm = () => {
    deleteStage.mutate({ stageId, moveToStageId: moveTo }, { onSuccess: onDeleted });
  };

  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogMedia className="bg-danger-soft text-destructive">
          <TrashIcon />
        </AlertDialogMedia>
        <AlertDialogTitle>Delete “{stage?.name ?? 'stage'}”?</AlertDialogTitle>
        <AlertDialogDescription>
          {!allowed.ok
            ? allowed.reason
            : leads.length === 0
              ? 'No leads are in this stage. This cannot be undone.'
              : `${leads.length} lead${leads.length === 1 ? ' is' : 's are'} in this stage. Choose where ${leads.length === 1 ? 'it' : 'they'} should move.`}
        </AlertDialogDescription>
      </AlertDialogHeader>

      {allowed.ok && leads.length > 0 && (
        <Field>
          <FieldLabel htmlFor="delete-stage-target">Move leads to</FieldLabel>
          <Select
            value={moveTo}
            onValueChange={(value) => setTarget(value)}
            items={targets.map((item) => ({ value: item.id, label: item.name }))}
          >
            <SelectTrigger id="delete-stage-target" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {deleteStage.isError && (
        <p className="text-sm text-destructive">The stage could not be deleted. Try again.</p>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={deleteStage.isPending}>Cancel</AlertDialogCancel>
        {allowed.ok && (
          <AlertDialogAction
            variant="destructive"
            disabled={deleteStage.isPending || (leads.length > 0 && !moveTo)}
            onClick={confirm}
          >
            {leads.length > 0 ? 'Move leads and delete' : 'Delete stage'}
          </AlertDialogAction>
        )}
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
