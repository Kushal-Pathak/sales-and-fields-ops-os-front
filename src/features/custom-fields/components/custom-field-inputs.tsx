import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { CustomValues, FieldDefinition, FieldValue } from '@/types/domain';
import { coerceValue, toInputValue, type FieldErrors } from '../utils/field-values';

interface CustomFieldInputsProps {
  fields: FieldDefinition[];
  values: CustomValues;
  errors?: FieldErrors | undefined;
  onChange: (key: string, value: FieldValue | undefined) => void;
  /** Prefix for input ids, so two forms on one page do not collide. */
  idPrefix: string;
  className?: string | undefined;
}

/** Form controls for a record's custom fields. Renders nothing when there are no fields. */
export function CustomFieldInputs({
  fields,
  values,
  errors,
  onChange,
  idPrefix,
  className,
}: CustomFieldInputsProps) {
  if (fields.length === 0) return null;
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const error = errors?.[field.key];
        const value = toInputValue(field, values[field.key]);
        const set = (raw: string | boolean) => onChange(field.key, coerceValue(field, raw));
        const wide = field.type === 'textarea';
        const label = (
          <FieldLabel htmlFor={id}>
            {field.label}
            {field.required && (
              <span className="ml-0.5 text-destructive" aria-label="required">
                *
              </span>
            )}
          </FieldLabel>
        );
        return (
          <Field
            key={field.id}
            data-invalid={error ? true : undefined}
            className={cn(wide && 'col-span-2')}
          >
            {field.type === 'checkbox' ? (
              <label className="flex items-center gap-2 pt-1 text-sm font-medium" htmlFor={id}>
                <Checkbox
                  id={id}
                  checked={value === true}
                  onCheckedChange={(checked) => set(checked === true)}
                  aria-invalid={error ? true : undefined}
                />
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </label>
            ) : field.type === 'select' ? (
              <>
                {label}
                <Select
                  value={typeof value === 'string' && value ? value : null}
                  onValueChange={(next) => set(next ?? '')}
                  items={(field.options ?? []).map((option) => ({ value: option, label: option }))}
                >
                  <SelectTrigger id={id} className="w-full" aria-invalid={error ? true : undefined}>
                    <SelectValue placeholder="Choose…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>—</SelectItem>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : field.type === 'textarea' ? (
              <>
                {label}
                <Textarea
                  id={id}
                  rows={3}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => set(event.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </>
            ) : (
              <>
                {label}
                <Input
                  id={id}
                  type={
                    field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
                  }
                  step={field.type === 'number' ? 'any' : undefined}
                  inputMode={field.type === 'number' ? 'decimal' : undefined}
                  value={typeof value === 'string' ? value : ''}
                  onChange={(event) => set(event.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </>
            )}
            {field.hint && !error && <FieldDescription>{field.hint}</FieldDescription>}
            <FieldError>{error}</FieldError>
          </Field>
        );
      })}
    </div>
  );
}
