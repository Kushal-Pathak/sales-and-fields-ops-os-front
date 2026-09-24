import { useWorkspace } from '@/features/workspace';
import { cn } from '@/lib/utils';
import type { CustomValues, FieldEntity } from '@/types/domain';
import { useFieldDefinitions } from '../hooks/use-field-definitions';
import { formatValue } from '../utils/field-values';

interface CustomFieldValuesProps {
  entity: FieldEntity;
  values: CustomValues | undefined;
  /** Section heading; omit to render the grid alone. */
  title?: string | undefined;
  className?: string | undefined;
}

/** Read-only label/value pairs for a record's custom fields. Renders nothing without definitions. */
export function CustomFieldValues({ entity, values, title, className }: CustomFieldValuesProps) {
  const fields = useFieldDefinitions(entity).data ?? [];
  const locale = useWorkspace().data?.locale;
  if (fields.length === 0) return null;

  const grid = (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((field) => {
        const text = formatValue(field, values?.[field.key], locale);
        return (
          <div key={field.id} className="min-w-0">
            <dt className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
              {field.label}
            </dt>
            <dd
              className={cn(
                'mt-0.5 text-base',
                field.type === 'textarea' ? 'whitespace-pre-wrap' : 'truncate',
                !text && 'text-foreground-faint',
              )}
            >
              {text || '—'}
            </dd>
          </div>
        );
      })}
    </dl>
  );

  if (!title) return <div className={className}>{grid}</div>;
  return (
    <section className={className}>
      <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
        {title}
      </h3>
      {grid}
    </section>
  );
}
