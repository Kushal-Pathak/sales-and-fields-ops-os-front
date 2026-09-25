import { useState, type FormEvent } from 'react';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { STATUS_COLOR_CLASSES } from '@/components/common/status-color';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCan } from '@/features/auth';
import { useStages } from '@/features/workspace';
import { cn } from '@/lib/utils';
import type { Stage, StageKind, StatusColor } from '@/types/domain';
import { useCreateStage, useUpdateStage } from '../hooks/use-stage-mutations';
import { nextOrder } from '../utils/stage-order';

export const NEW_STAGE_ID = 'new';

interface StageDrawerProps {
  pipelineId: string;
  /** `?stage=` value: a stage id, `new`, or `null` when closed. */
  stageId: string | null;
  onClose: () => void;
  onDelete: (stageId: string) => void;
}

const COLORS: { value: StatusColor; label: string }[] = [
  { value: 'neutral', label: 'Grey' },
  { value: 'info', label: 'Blue' },
  { value: 'highlight', label: 'Purple' },
  { value: 'warning', label: 'Amber' },
  { value: 'success', label: 'Green' },
  { value: 'destructive', label: 'Red' },
];

const KINDS: { value: StageKind; label: string; hint: string }[] = [
  { value: 'open', label: 'Open', hint: 'Leads are still being worked.' },
  { value: 'won', label: 'Won', hint: 'Leads end their journey here as customers.' },
  { value: 'lost', label: 'Lost', hint: 'The lead is no longer pursuing.' },
];

/** Create or edit one stage. Keyed on the stage id so the form resets when it changes. */
export function StageDrawer({ pipelineId, stageId, onClose, onDelete }: StageDrawerProps) {
  const stages = useStages(pipelineId).data;
  const stage =
    stageId && stageId !== NEW_STAGE_ID ? stages?.find((s) => s.id === stageId) : undefined;
  const ready = stageId === NEW_STAGE_ID || stage !== undefined;

  return (
    <DrawerPanel open={stageId !== null} onOpenChange={(open) => !open && onClose()}>
      {stageId !== null && ready && stages && (
        <StageForm
          key={stageId}
          pipelineId={pipelineId}
          stage={stage}
          stages={stages}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
      {stageId !== null && !ready && stages && (
        <>
          <DrawerHeader>
            <DrawerTitle>Stage not found</DrawerTitle>
            <DrawerDescription>It may have been deleted.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </DrawerFooter>
        </>
      )}
    </DrawerPanel>
  );
}

interface StageFormProps {
  pipelineId: string;
  stage: Stage | undefined;
  stages: Stage[];
  onClose: () => void;
  onDelete: (stageId: string) => void;
}

function StageForm({ pipelineId, stage, stages, onClose, onDelete }: StageFormProps) {
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState<StatusColor>(stage?.color ?? 'neutral');
  const [kind, setKind] = useState<StageKind>(stage?.kind ?? 'open');
  const [defaultTask, setDefaultTask] = useState(stage?.defaultTaskTitle ?? '');
  const [error, setError] = useState<string | null>(null);

  const isPending = createStage.isPending || updateStage.isPending;
  const canManage = useCan('settings.manage');
  const saveError = createStage.error ?? updateStage.error;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a stage name.');
    const duplicate = stages.some(
      (item) => item.id !== stage?.id && item.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return setError('A stage with this name already exists.');
    setError(null);

    const task = defaultTask.trim();
    if (stage) {
      updateStage.mutate(
        {
          id: stage.id,
          patch: { name: trimmed, color, kind, defaultTaskTitle: task || undefined },
        },
        { onSuccess: onClose },
      );
    } else {
      createStage.mutate(
        {
          pipelineId,
          name: trimmed,
          color,
          kind,
          order: nextOrder(stages, pipelineId),
          ...(task && { defaultTaskTitle: task }),
        },
        { onSuccess: onClose },
      );
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col">
      <DrawerHeader>
        <DrawerTitle>{stage ? 'Edit stage' : 'New stage'}</DrawerTitle>
        <DrawerDescription>
          {stage
            ? 'Changes apply to every lead in this stage.'
            : 'Added at the end of the pipeline.'}
        </DrawerDescription>
      </DrawerHeader>

      <DrawerBody>
        <FieldGroup className="gap-5">
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="stage-name">Stage name</FieldLabel>
            <Input
              id="stage-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
            <FieldError>{error}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Colour</FieldLabel>
            <RadioGroup
              aria-label="Stage colour"
              value={color}
              onValueChange={(value) => setColor(value as StatusColor)}
              className="flex w-auto gap-2"
            >
              {COLORS.map((option) => (
                <RadioGroupItem
                  key={option.value}
                  value={option.value}
                  aria-label={option.label}
                  title={option.label}
                  className={cn(
                    'size-6 border-2 border-transparent data-checked:border-foreground',
                    STATUS_COLOR_CLASSES[option.value].swatch,
                  )}
                />
              ))}
            </RadioGroup>
          </Field>

          <Field>
            <FieldLabel>Type</FieldLabel>
            <RadioGroup value={kind} onValueChange={(value) => setKind(value as StageKind)}>
              {KINDS.map((option) => (
                <FieldLabel key={option.value} className="items-start gap-2.5 font-normal">
                  <RadioGroupItem value={option.value} className="mt-0.5" />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </span>
                </FieldLabel>
              ))}
            </RadioGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="stage-task">Default task</FieldLabel>
            <Input
              id="stage-task"
              placeholder="e.g. Follow-up call"
              value={defaultTask}
              onChange={(event) => setDefaultTask(event.target.value)}
            />
            <FieldDescription>Suggested when a lead enters this stage.</FieldDescription>
          </Field>
        </FieldGroup>

        {saveError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The stage could not be saved. Try again.
          </p>
        )}
      </DrawerBody>

      <DrawerFooter>
        {stage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={!canManage}
            onClick={() => onDelete(stage.id)}
          >
            Delete stage
          </Button>
        )}
        <span className="flex-1" />
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !canManage}>
          {stage ? 'Save changes' : 'Add stage'}
        </Button>
      </DrawerFooter>
    </form>
  );
}
