import { useState, type FormEvent } from 'react';
import { TrashIcon } from 'lucide-react';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/features/auth';
import type { FieldDefinition, FieldEntity, FieldType } from '@/types/domain';
import { useFieldDefinitions } from '../hooks/use-field-definitions';
import { useCreateField, useUpdateField } from '../hooks/use-field-mutations';
import { isValidKey, slugKey, uniqueKey } from '../utils/field-keys';
import { ENTITY_LABEL, FIELD_TYPE_LABEL, FIELD_TYPES } from '../utils/field-labels';
import { nextFieldOrder } from '../utils/field-values';

export const NEW_FIELD_ID = 'new';

interface FieldDrawerProps {
  entity: FieldEntity;
  /** `?field=` value: a field id, `new`, or `null` when closed. */
  fieldId: string | null;
  onClose: () => void;
  onDelete: (fieldId: string) => void;
}

/** Create or edit one custom field. Keyed on the id so the form resets when it changes. */
export function FieldDrawer({ entity, fieldId, onClose, onDelete }: FieldDrawerProps) {
  const all = useFieldDefinitions().data;
  const field =
    fieldId && fieldId !== NEW_FIELD_ID ? all?.find((f) => f.id === fieldId) : undefined;
  const ready = fieldId === NEW_FIELD_ID || field !== undefined;

  return (
    <DrawerPanel open={fieldId !== null} onOpenChange={(open) => !open && onClose()}>
      {fieldId !== null && ready && all && (
        <FieldForm
          key={fieldId}
          entity={field?.entity ?? entity}
          field={field}
          all={all}
          onClose={onClose}
          onDelete={onDelete}
        />
      )}
    </DrawerPanel>
  );
}

interface FormErrors {
  label?: string;
  key?: string;
  options?: string;
}

function FieldForm({
  entity,
  field,
  all,
  onClose,
  onDelete,
}: {
  entity: FieldEntity;
  field: FieldDefinition | undefined;
  all: FieldDefinition[];
  onClose: () => void;
  onDelete: (fieldId: string) => void;
}) {
  const create = useCreateField();
  const update = useUpdateField();
  const [label, setLabel] = useState(field?.label ?? '');
  const [key, setKey] = useState(field?.key ?? '');
  const [keyTouched, setKeyTouched] = useState(Boolean(field));
  const [type, setType] = useState<FieldType>(field?.type ?? 'text');
  const [options, setOptions] = useState((field?.options ?? []).join('\n'));
  const [required, setRequired] = useState(field?.required ?? false);
  const [hint, setHint] = useState(field?.hint ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const isPending = create.isPending || update.isPending;
  const canManage = useCan('settings.manage');
  const saveError = create.error ?? update.error;
  const takenKeys = all.filter((f) => f.entity === entity && f.id !== field?.id).map((f) => f.key);

  const onLabelChange = (next: string) => {
    setLabel(next);
    if (!keyTouched) setKey(uniqueKey(slugKey(next), takenKeys));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: FormErrors = {};
    const cleanOptions = options
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (!label.trim()) next.label = 'Give the field a label.';
    if (!isValidKey(key)) next.key = 'Letters and numbers only, starting with a letter.';
    else if (takenKeys.includes(key)) next.key = 'Another field already uses this key.';
    if (type === 'select' && cleanOptions.length === 0) next.options = 'Add at least one option.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const shared = {
      label: label.trim(),
      key,
      type,
      required,
    };
    if (field) {
      update.mutate(
        {
          id: field.id,
          patch: {
            ...shared,
            options: type === 'select' ? cleanOptions : undefined,
            hint: hint.trim() || undefined,
          },
        },
        { onSuccess: onClose },
      );
      return;
    }
    create.mutate(
      {
        ...shared,
        entity,
        order: nextFieldOrder(all, entity),
        ...(type === 'select' && { options: cleanOptions }),
        ...(hint.trim() && { hint: hint.trim() }),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>{field ? 'Edit field' : 'New field'}</DrawerTitle>
        <DrawerDescription>
          {field
            ? `A custom field on ${ENTITY_LABEL[entity].toLowerCase()}.`
            : `Adds a field to ${ENTITY_LABEL[entity].toLowerCase()}.`}
        </DrawerDescription>
      </DrawerHeader>
      <DrawerBody>
        <FieldGroup className="gap-4">
          <Field data-invalid={errors.label ? true : undefined}>
            <FieldLabel htmlFor="field-label">Label</FieldLabel>
            <Input
              id="field-label"
              autoFocus
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
              aria-invalid={errors.label ? true : undefined}
            />
            <FieldError>{errors.label}</FieldError>
          </Field>
          <Field data-invalid={errors.key ? true : undefined}>
            <FieldLabel htmlFor="field-key">Key</FieldLabel>
            <Input
              id="field-key"
              className="font-mono text-xs"
              value={key}
              onChange={(event) => {
                setKeyTouched(true);
                setKey(event.target.value);
              }}
              aria-invalid={errors.key ? true : undefined}
            />
            <FieldDescription>
              How the value is stored and exported. Changing it later orphans existing values.
            </FieldDescription>
            <FieldError>{errors.key}</FieldError>
          </Field>
          <Field>
            <FieldLabel htmlFor="field-type">Type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => value && setType(value as FieldType)}
              items={FIELD_TYPES.map((item) => ({ value: item, label: FIELD_TYPE_LABEL[item] }))}
            >
              <SelectTrigger id="field-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {FIELD_TYPE_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {type === 'select' && (
            <Field data-invalid={errors.options ? true : undefined}>
              <FieldLabel htmlFor="field-options">Options</FieldLabel>
              <Textarea
                id="field-options"
                rows={4}
                placeholder={'One per line'}
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                aria-invalid={errors.options ? true : undefined}
              />
              <FieldError>{errors.options}</FieldError>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="field-hint">Hint</FieldLabel>
            <Input
              id="field-hint"
              placeholder="Shown under the input"
              value={hint}
              onChange={(event) => setHint(event.target.value)}
            />
          </Field>
          <label className="flex items-center gap-3 rounded-lg border p-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium">Required</span>
              <span className="text-xs text-muted-foreground">
                The form cannot be saved without a value.
              </span>
            </span>
            <Switch checked={required} onCheckedChange={setRequired} aria-label="Required" />
          </label>
        </FieldGroup>
        {saveError && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            The field could not be saved. Try again.
          </p>
        )}
      </DrawerBody>
      <DrawerFooter>
        {field && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={!canManage}
            onClick={() => onDelete(field.id)}
          >
            <TrashIcon /> Delete
          </Button>
        )}
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || !canManage}>
          {field ? 'Save changes' : 'Add field'}
        </Button>
      </DrawerFooter>
    </form>
  );
}
