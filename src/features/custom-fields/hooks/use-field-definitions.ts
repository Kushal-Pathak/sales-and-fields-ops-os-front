import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { FieldDefinition, FieldEntity } from '@/types/domain';
import { sortFields } from '../utils/field-values';

/** The workspace's custom fields, in display order, optionally for one record type. */
export function useFieldDefinitions(entity?: FieldEntity) {
  const select = useCallback(
    (rows: FieldDefinition[]) =>
      sortFields(entity ? rows.filter((row) => row.entity === entity) : rows),
    [entity],
  );
  return useQuery({
    queryKey: queryKeys.fields.list(),
    queryFn: ({ signal }) => db.fields.list({ signal }),
    select,
  });
}
